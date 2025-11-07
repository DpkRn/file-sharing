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
      setFileInfo(fileInfo);
      const peer = createPeerConnection((data) => console.log("Sender data:", data));

      await peer.setRemoteDescription(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("send-answer", { roomId, answer });
    });

    socket.on("ice-candidate", async (candidate) => {
      try {
        await peerRef.current.addIceCandidate(candidate);
      } catch (err) {
        console.error("Error adding ICE candidate:", err);
      }
    });

    return () => socket.off();
  }, [socket, isConnected, roomId]);

  return (
    <div className="min-h-screen bg-[#1e1f25] flex items-center justify-center">
      <DownloadCard fileInfo={fileInfo} />
    </div>
  );
};

export default Receiver;
