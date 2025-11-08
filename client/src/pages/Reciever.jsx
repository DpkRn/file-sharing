import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";
import { useWebRTC } from "../context/WebRTCProvider";
import DownloadCard from "../components/DownloadCard";

const Receiver = () => {
  const { url: roomId } = useParams();
  const { socket, isConnected } = useSocket();
  const { peer, createAnswer } = useWebRTC(); // Corrected
  const [fileInfo, setFileInfo] = useState(null);

  useEffect(() => {
    if (!socket || !isConnected || !peer) return;
    socket.emit("join-room", { roomId, isSender: false });
    const handleReceiveOffer = async ({ offer, fileInfo }) => {
      console.log("offer recieved from sender:", offer, fileInfo);
      const answer = await createAnswer(offer);
      socket.emit("send-answer", { roomId, answer });
      setFileInfo(fileInfo);
    };

    socket.on("receive-offer", handleReceiveOffer);

    return () => {
      socket.off("receive-offer", handleReceiveOffer);
    };
  }, [socket, isConnected, roomId, peer]);

  return (
    <div className="min-h-screen bg-[#1e1f25] flex items-center justify-center">
      <DownloadCard fileInfo={fileInfo} />
    </div>
  );
};

export default Receiver;
