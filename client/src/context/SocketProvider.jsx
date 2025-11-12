import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [isSender,setIsSender]=useState(true);
  const [socketError,setSocketError]=useState("")

  const socket = useMemo(
    () =>
      io(import.meta.env.VITE_SOCKET_URL || "http://localhost:8001", {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
      }),
    []
  );

  useEffect(() => {
    //register connect even
    socket.on("connect", () => {
      console.log("✅ Connected to Socket:", socket.id);
      setSocketError("")
      setIsConnected(true);
    });

    //register disconnect even
    socket.on("disconnect", () => {
      console.log("❌ Disconnected from Socket");
      setIsConnected(false);
    });

    //register connection error
    socket.on("connect_error", (err) => {
      setSocketError(err.message)
      console.error("⚠️ Socket connection error:", err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  

  return (
    <SocketContext.Provider value={{ socket, isConnected, roomId, setRoomId,setIsSender,isSender,socketError }}>
      {children}
    </SocketContext.Provider>
  );
};
