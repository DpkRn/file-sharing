import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Copy, Check, AlertCircle, Wifi } from 'lucide-react';

const CHUNK_SIZE = 16384; // 16KB chunks for datachannel
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export default function FileShare() {
  const [mode, setMode] = useState(null); // 'send' or 'receive'
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [connection, setConnection] = useState('disconnected');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [status, setStatus] = useState('');
  
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const fileRef = useRef(null);
  const fileStreamRef = useRef(null);
  const receivedChunksRef = useRef([]);
  const receivedSizeRef = useRef(0);
  const fileWriterRef = useRef(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    
    if (roomId) {
      setMode('receive');
      initializeReceiver(roomId);
    }
    
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (dcRef.current) dcRef.current.close();
    if (pcRef.current) pcRef.current.close();
    if (wsRef.current) wsRef.current.close();
    if (fileStreamRef.current) {
      fileStreamRef.current.cancel();
    }
  };

  const connectWebSocket = (roomId, isSender) => {
    console.log(roomId)
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:3001?room=${roomId}&role=${isSender ? 'sender' : 'receiver'}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        resolve(ws);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
      
      wsRef.current = ws;
    });
  };

  const initializeSender = async (file) => {
    const roomId = generateRoomId();
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    setShareUrl(url);
    
    try {
      setStatus('Connecting to signaling server...');
      const ws = await connectWebSocket(roomId, true);
      
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
     
      pcRef.current = pc;
      
     
      pc.onicecandidate = (event) => {
        console.log('event:',event)
        if (event.candidate) {
          ws.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate
          }));
        }
      };
      
      pc.onconnectionstatechange = () => {
        setConnection(pc.connectionState);
        if (pc.connectionState === 'connected') {
          setStatus('Peer connected! Waiting to send file...');
        }
      };
      
      ws.onmessage = async (event) => {
        console.log("event came through websocket:",event.data)
        const data = JSON.parse(event.data);
        
        if (data.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } else if (data.type === 'ice-candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      };
      
      setStatus('Creating offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      ws.send(JSON.stringify({
        type: 'offer',
        offer: offer
      }));


       const dc = pc.createDataChannel('fileTransfer', {
        ordered: true,
        maxRetransmits: 3
      });
      dcRef.current = dc;
      
      console.log("setting up data channel")
      setupDataChannel(dc, true, file);
      
      
      setStatus('Waiting for receiver to connect...');
      
    } catch (error) {
      console.error('Error initializing sender:', error);
      setStatus(`Error: ${error.message}`);
    }
  };

  const initializeReceiver = async (roomId) => {
    try {
      setStatus('Connecting to signaling server...');
      const ws = await connectWebSocket(roomId, false);
      
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      
      pc.ondatachannel = (event) => {
        const dc = event.channel;
        dcRef.current = dc;
        setupDataChannel(dc, false);
      };
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          ws.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate
          }));
        }
      };
      
      pc.onconnectionstatechange = () => {
        setConnection(pc.connectionState);
        if (pc.connectionState === 'connected') {
          setStatus('Connected! Waiting for file...');
        }
      };
      
      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          ws.send(JSON.stringify({
            type: 'answer',
            answer: answer
          }));
          
          setStatus('Negotiation complete, waiting for file...');
        } else if (data.type === 'ice-candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      };
      
    } catch (error) {
      console.error('Error initializing receiver:', error);
      setStatus(`Error: ${error.message}`);
    }
  };

  const setupDataChannel = (dc, isSender, file = null) => {
    dc.binaryType = 'arraybuffer';
    
    dc.onopen = () => {
      console.log('Data channel opened');
      if (isSender && file) {
        sendFile(file);
      }
    };
    
    dc.onclose = () => {
      console.log('Data channel closed');
      setStatus('Connection closed');
    };
    
    dc.onerror = (error) => {
      console.error('Data channel error:', error);
      setStatus('Data channel error');
    };
    
    if (!isSender) {
      dc.onmessage = handleReceiveMessage;
    }
  };

  const sendFile = async (file) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== 'open') {
      setStatus('Data channel not ready');
      return;
    }
    
    setStatus('Sending file metadata...');
    
    // Send metadata
    dc.send(JSON.stringify({
      type: 'metadata',
      name: file.name,
      size: file.size,
      mimeType: file.type
    }));
    
    setStatus('Streaming file...');
    setProgress(0);
    
    const stream = file.stream();
    const reader = stream.getReader();
    let sentSize = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        // Wait if buffer is full
        while (dc.bufferedAmount > CHUNK_SIZE * 64) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        dc.send(value);
        sentSize += value.byteLength;
        setProgress(Math.round((sentSize / file.size) * 100));
      }
      
      // Send end signal
      dc.send(JSON.stringify({ type: 'end' }));
      setStatus('File sent successfully!');
      
    } catch (error) {
      console.error('Error sending file:', error);
      setStatus(`Error sending file: ${error.message}`);
    }
  };

  const handleReceiveMessage = async (event) => {
    if (typeof event.data === 'string') {
      const data = JSON.parse(event.data);
      
      if (data.type === 'metadata') {
        setFileName(data.name);
        setFileSize(data.size);
        receivedSizeRef.current = 0;
        receivedChunksRef.current = [];
        setProgress(0);
        setStatus('Receiving file...');
        
        // Initialize file writer stream
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: data.name,
            types: [{
              description: 'File',
              accept: { [data.mimeType || '*/*']: [`.${data.name.split('.').pop()}`] }
            }]
          });
          
          const writable = await handle.createWritable();
          fileWriterRef.current = writable;
        } catch (error) {
          console.error('Error creating file writer:', error);
          setStatus('Please allow file save permission');
        }
      } else if (data.type === 'end') {
        if (fileWriterRef.current) {
          await fileWriterRef.current.close();
          fileWriterRef.current = null;
        }
        setStatus('File received successfully!');
        setProgress(100);
      }
    } else {
      // Binary data - write directly to file
      if (fileWriterRef.current) {
        try {
          await fileWriterRef.current.write(event.data);
          receivedSizeRef.current += event.data.byteLength;
          setProgress(Math.round((receivedSizeRef.current / fileSize) * 100));
        } catch (error) {
          console.error('Error writing to file:', error);
          setStatus(`Error writing file: ${error.message}`);
        }
      }
    }
  };

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      fileRef.current = file;
      setFileName(file.name);
      setFileSize(file.size);
      setMode('send');
      initializeSender(file);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const getStatusColor = () => {
    if (connection === 'connected') return 'text-green-600';
    if (connection === 'connecting') return 'text-yellow-600';
    if (connection === 'failed' || connection === 'disconnected') return 'text-red-600';
    return 'text-gray-600';
  };

  if (!mode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wifi className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">P2P File Share</h1>
            <p className="text-gray-600">Direct peer-to-peer file transfer using WebRTC</p>
          </div>
          
          <label className="block">
            <div className="border-2 border-dashed border-indigo-300 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition">
              <Upload className="mx-auto text-indigo-600 mb-4" size={48} />
              <p className="text-lg font-semibold text-gray-700 mb-2">Choose File to Share</p>
              <p className="text-sm text-gray-500">Supports files up to 50GB+</p>
              <input 
                type="file" 
                onChange={handleFileSelect} 
                className="hidden"
              />
            </div>
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            {mode === 'send' ? 'Sending File' : 'Receiving File'}
          </h1>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connection === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {connection}
            </span>
          </div>
        </div>

        {fileName && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              {mode === 'send' ? <Upload className="text-indigo-600" /> : <Download className="text-green-600" />}
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{fileName}</p>
                <p className="text-sm text-gray-600">{formatFileSize(fileSize)}</p>
              </div>
            </div>
          </div>
        )}

        {mode === 'send' && shareUrl && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share this URL with the receiver:
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={shareUrl} 
                readOnly 
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
              <button 
                onClick={copyToClipboard}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-semibold text-indigo-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
          <AlertCircle className="text-blue-600 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800 mb-1">Status</p>
            <p className="text-sm text-gray-600">{status}</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong> Files are transferred directly between peers using WebRTC. 
            No data is uploaded to any server. The connection is peer-to-peer and secure.
          </p>
        </div>
      </div>
    </div>
  );
}