import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";
import { useWebRTC } from "../context/WebRTCProvider";
import DownloadCard from "../components/DownloadCard";

const Receiver = () => {
  const { url: roomId } = useParams();
  const { socket, isConnected } = useSocket();
  const { peerRef, createPeerConnection } = useWebRTC();
  const [fileInfo, setFileInfo] = useState(null);

  useEffect(() => {
  if (!socket || !isConnected) return;

  socket.emit("join-room", { roomId, isSender: false });

  socket.on("receive-offer", async ({ offer, fileInfo }) => {
    console.log("📦 Received offer:", fileInfo);
    setFileInfo(fileInfo);
    socket.emit("send-answer", { roomId, answer: {} });
  });

  return () => socket.off("receive-offer");
}, [socket, isConnected, roomId]);

  return (
    <div className="min-h-screen bg-[#1e1f25] flex items-center justify-center">
      <DownloadCard fileInfo={fileInfo} />
    </div>
  );
};

export default Receiver;
