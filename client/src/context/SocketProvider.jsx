import React, { createContext, useContext, useMemo, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);

  const socket = useMemo(
    () =>
      io(import.meta.env.VITE_SOCKET_URL || "http://localhost:8001", {
        transports: ["websocket"],
        reconnection: true,
      }),
    []
  );

  useEffect(() => {
    socket.on("connect", () => {
      setIsConnected(true);
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("❌ Socket disconnected");
    });

    return () => {
      socket.disconnect();
      console.log("🧹 Socket cleaned up");
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
