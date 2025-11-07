import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

const SocketContext = createContext(null);

function createWebSocket(roomId, isSender) {
  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket(`ws://localhost:3001?room=${roomId}&role=${isSender ? 'sender' : 'receiver'}`);

      ws.onopen = () => {
        console.log('WebSocket connected');
        resolve(ws);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      ws.onclose = (ev) => {
        console.log('WebSocket closed', ev);
      };
    } catch (err) {
      reject(err);
    }
  });
}

export function SocketProvider({ children }) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [role, setRole] = useState(null);

  const connect = useCallback(async (roomId, isSender) => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    const ws = await createWebSocket(roomId, isSender);
    wsRef.current = ws;
    setConnected(true);
    setRoom(roomId);
    setRole(isSender ? 'sender' : 'receiver');

    ws.onclose = () => {
      setConnected(false);
    };

    return ws;
  }, []);

  const send = useCallback((data) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not open');
    }
    wsRef.current.send(data);
  }, []);

  const close = useCallback(() => {
    try {
      if (wsRef.current) wsRef.current.close();
    } finally {
      wsRef.current = null;
      setConnected(false);
      setRoom(null);
      setRole(null);
    }
  }, []);

  const value = {
    wsRef,
    connected,
    room,
    role,
    connect,
    send,
    close
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
  return ctx;
}

export default SocketProvider;

