export const CHUNK_SIZE = 16384; // 16KB chunks for datachannel
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export function cleanup({ dcRef, pcRef, wsRef, fileStreamRef }) {
  try {
    if (dcRef && dcRef.current) dcRef.current.close();
  } catch (e) {
    console.warn('Error closing datachannel', e);
  }

  try {
    if (pcRef && pcRef.current) pcRef.current.close();
  } catch (e) {
    console.warn('Error closing peer connection', e);
  }

  try {
    if (wsRef && wsRef.current) wsRef.current.close();
  } catch (e) {
    console.warn('Error closing websocket', e);
  }

  try {
    if (fileStreamRef && fileStreamRef.current) fileStreamRef.current.cancel();
  } catch (e) {
    console.warn('Error cancelling file stream', e);
  }
}

export async function initializeSender({ file, roomId, ws, pcRef, dcRef, setStatus, setConnection, setProgress }) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  pcRef.current = pc;

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
    }
  };

  pc.onconnectionstatechange = () => {
    setConnection && setConnection(pc.connectionState);
    if (pc.connectionState === 'connected') {
      setStatus && setStatus('Peer connected! Waiting to send file...');
    }
  };

  ws.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      } else if (data.type === 'ice-candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch (err) {
      console.error('ws message parse error', err);
    }
  };

  setStatus && setStatus('Creating offer...');
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  ws.send(JSON.stringify({ type: 'offer', offer }));

  const dc = pc.createDataChannel('fileTransfer', { ordered: true, maxRetransmits: 3 });
  dcRef.current = dc;

  setupDataChannel(dc, true, file, { dcRef, setStatus, setProgress });

  setStatus && setStatus('Waiting for receiver to connect...');
}

export async function initializeReceiver({ roomId, ws, pcRef, dcRef, setStatus, setConnection, handleReceiveMessage }) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  pcRef.current = pc;

  pc.ondatachannel = (event) => {
    const dc = event.channel;
    dcRef.current = dc;
    setupDataChannel(dc, false, null, { dcRef, setStatus, handleReceiveMessage });
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
    }
  };

  pc.onconnectionstatechange = () => {
    setConnection && setConnection(pc.connectionState);
    if (pc.connectionState === 'connected') {
      setStatus && setStatus('Connected! Waiting for file...');
    }
  };

  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({ type: 'answer', answer }));
      setStatus && setStatus('Negotiation complete, waiting for file...');
    } else if (data.type === 'ice-candidate') {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  };
}

export function setupDataChannel(dc, isSender, file = null, { dcRef, setStatus, setProgress, handleReceiveMessage } = {}) {
  dc.binaryType = 'arraybuffer';

  dc.onopen = () => {
    console.log('Data channel opened');
    if (isSender && file) {
      sendFile(file, dc, setProgress, setStatus).catch(err => {
        console.error('sendFile error', err);
        setStatus && setStatus(`Error sending file: ${err.message}`);
      });
    }
  };

  dc.onclose = () => {
    console.log('Data channel closed');
    setStatus && setStatus('Connection closed');
  };

  dc.onerror = (error) => {
    console.error('Data channel error:', error);
    setStatus && setStatus('Data channel error');
  };

  if (!isSender && handleReceiveMessage) {
    dc.onmessage = handleReceiveMessage;
  }
}

export async function sendFile(file, dc, setProgress, setStatus) {
  if (!dc || dc.readyState !== 'open') {
    setStatus && setStatus('Data channel not ready');
    return;
  }

  setStatus && setStatus('Sending file metadata...');
  dc.send(JSON.stringify({ type: 'metadata', name: file.name, size: file.size, mimeType: file.type }));

  setStatus && setStatus('Streaming file...');
  setProgress && setProgress(0);

  const stream = file.stream();
  const reader = stream.getReader();
  let sentSize = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      while (dc.bufferedAmount > CHUNK_SIZE * 64) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      dc.send(value);
      sentSize += value.byteLength;
      setProgress && setProgress(Math.round((sentSize / file.size) * 100));
    }

    dc.send(JSON.stringify({ type: 'end' }));
    setStatus && setStatus('File sent successfully!');
  } catch (error) {
    console.error('Error sending file:', error);
    setStatus && setStatus(`Error sending file: ${error.message}`);
  }
}

export async function handleReceiveMessage(event, { fileWriterRef, setFileName, setFileSize, setFileType, setProgress, setStatus } = {}) {
  if (typeof event.data === 'string') {
    const data = JSON.parse(event.data);

    if (data.type === 'metadata') {
      setFileName && setFileName(data.name);
      setFileSize && setFileSize(data.size);
      // set mime/type when available
      if (data.mimeType) {
        setFileType && setFileType(data.mimeType);
      }
      setProgress && setProgress(0);
      setStatus && setStatus('Receiving file...');

      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: data.name,
          types: [{ description: 'File', accept: { [data.mimeType || '*/*']: [`.${data.name.split('.').pop()}`] } }]
        });

        const writable = await handle.createWritable();
        fileWriterRef.current = writable;
      } catch (error) {
        console.error('Error creating file writer:', error);
        setStatus && setStatus('Please allow file save permission');
      }
    } else if (data.type === 'end') {
      if (fileWriterRef.current) {
        await fileWriterRef.current.close();
        fileWriterRef.current = null;
      }
      setStatus && setStatus('File received successfully!');
      setProgress && setProgress(100);
    }
  } else {
    if (fileWriterRef.current) {
      try {
        await fileWriterRef.current.write(event.data);
        const added = event.data.byteLength || event.data.length || 0;
        // caller should manage received size; here we only update progress if setFileSize exists
        setProgress && setProgress((prev) => {
          // if prev is a function or number; keep simple by returning prev+approx
          if (typeof prev === 'number') return prev + Math.round((added / (fileWriterRef.current._size || 1)) * 100);
          return prev;
        });
      } catch (error) {
        console.error('Error writing to file:', error);
        setStatus && setStatus(`Error writing file: ${error.message}`);
      }
    }
  }
}

// Note: helpers are exported as named exports above. The default export below
// is the WebRTCProvider (see end of file).

/* WebRTC Context + Hook */
import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { useSocket } from './socket';

const WebRTCContext = createContext(null);

function genRoomId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function WebRTCProvider({ children }) {
  const { connect, wsRef: socketWsRef } = useSocket();

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const fileWriterRef = useRef(null);
  const fileStreamRef = useRef(null);

  const [status, setStatus] = useState('');
  const [connection, setConnection] = useState('disconnected');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [fileType, setFileType] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  const startSender = useCallback(async (file) => {
    const roomId = genRoomId();
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    setShareUrl(url);

    setStatus('Connecting to signaling server...');
    const ws = await connect(roomId, true);
    // call the existing initializeSender helper
    await initializeSender({ file, roomId, ws, pcRef, dcRef, setStatus, setConnection, setProgress });
  }, [connect]);

  const joinRoom = useCallback(async (roomId) => {
    setStatus('Connecting to signaling server...');
    const ws = await connect(roomId, false);
    await initializeReceiver({ roomId, ws, pcRef, dcRef, setStatus, setConnection, handleReceiveMessage: (e) => handleReceiveMessage(e, { fileWriterRef, setFileName, setFileSize, setFileType, setProgress, setStatus }) });
  }, [connect]);

  const cleanupAll = useCallback(() => {
    cleanup({ dcRef, pcRef, wsRef: socketWsRef, fileStreamRef });
    setConnection('disconnected');
    setStatus('');
    setProgress(0);
  }, [socketWsRef]);

  const value = {
    pcRef,
    dcRef,
    fileWriterRef,
    fileStreamRef,
    status,
    connection,
    progress,
    fileName,
    fileSize,
    fileType,
    shareUrl,
    startSender,
    joinRoom,
    cleanupAll
  };

  return <WebRTCContext.Provider value={value}>{children}</WebRTCContext.Provider>;
}

export function useWebRTC() {
  const ctx = useContext(WebRTCContext);
  if (!ctx) throw new Error('useWebRTC must be used within a WebRTCProvider');
  return ctx;
}

export default WebRTCProvider;
