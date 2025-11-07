import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Copy, Check, AlertCircle, Wifi } from 'lucide-react';
import { useSocket } from '../provider/socket';
import * as WebRTC from '../provider/WebRTC';

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

  // socket context (requires wrapping app with <SocketProvider>)
  let socketCtx;
  try {
    socketCtx = useSocket();
  } catch (e) {
    socketCtx = null;
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    
    if (roomId) {
      setMode('receive');
      (async () => {
        try {
          setStatus('Connecting to signaling server...');
          const ws = socketCtx ? await socketCtx.connect(roomId, false) : await (async () => {
            // fallback to dynamic websocket if socket context not provided
            return new Promise((resolve, reject) => {
              try {
                const w = new WebSocket(`ws://localhost:3001?room=${roomId}&role=receiver`);
                w.onopen = () => resolve(w);
                w.onerror = reject;
              } catch (err) { reject(err); }
            });
          })();

          await WebRTC.initializeReceiver({ roomId, ws, pcRef, dcRef, setStatus, setConnection, handleReceiveMessage: (e) => WebRTC.handleReceiveMessage(e, { fileWriterRef, setFileName, setFileSize, setProgress, setStatus }) });
          wsRef.current = ws;
        } catch (err) {
          console.error(err);
          setStatus(`Error: ${err.message}`);
        }
      })();
    }
    
    return () => {
      WebRTC.cleanup({ dcRef, pcRef, wsRef, fileStreamRef });
    };
  }, []);

 
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      fileRef.current = file;
      setFileName(file.name);
      setFileSize(file.size);
      setMode('send');
      startSender(file);
    }
  };

  

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
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

return (<>

</>)
}