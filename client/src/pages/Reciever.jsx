import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Wifi, Download } from "lucide-react";
import { useSocket } from "../context/SocketProvider";
import { useWebRTC } from "../context/WebRTCProvider";
import DownloadCard from "../components/DownloadCard";

export default function Receiver() {
  const { url: roomId } = useParams();
  const { socket, isConnected, setIsSender, isSender } = useSocket();
  const { peerRef, createAnswer, isIceConnected } = useWebRTC();
  const [fileInfo, setFileInfo] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const [status, setStatus] = useState({
    socketConnected: false,
    joinedRoom: false,
    offerReceived: false,
    answerSent: false,
    iceConnected: false,
    channelReceived: false,
    channelOpened: false,
    dataReceived: false,
  });

  // 🧠 update when websocket connects
  useEffect(() => {
    if (roomId) {
      setIsSender(false);
    }
    if (isConnected) {
      setStatus((prev) => ({ ...prev, socketConnected: isConnected }));
    }

    if (isIceConnected) {
      setStatus((prev) => ({ ...prev, iceConnected: isIceConnected }));
    }
  }, [isConnected, roomId, isIceConnected]);

  const handleOffer = async ({ offer, fileInfo }) => {
    setStatus((prev) => ({ ...prev, offerReceived: true }));
    setStatus((prev) => ({ ...prev, joinedRoom: true }));

    peerRef.current.onicecandidate = (e) => {
      console.log("iceCandidate done:", e.candidate);
      if (e.candidate) {
        console.log(e.candidate);
        console.log("roomID:", roomId);
        socket.emit("ice-candidate", {
          roomId,
          candidate: e.candidate,
          isSender,
        });
      }
    };
     peerRef.current.ondatachannel = (event) => {
      const channel = event.channel;
      console.log("channel:",channel)
      const chunks = [];
      setStatus((prev) => ({ ...prev, channelReceived: true }));

      // Channel open
      channel.onopen = () => {
        setStatus((prev) => ({ ...prev, channelOpened: true }));
      };

      // Receiving data chunks
      channel.onmessage = (e) => {
        //console.log("data:",e.data)
       
        const {done}=e.data 
        if(!done){
           console.log("chunks:",chunks)
           chunks.push(e.data);
        }else{
        const blob = new Blob(chunks, { type: fileInfo.fileType });
        console.log("blob:",blob)
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setStatus((prev) => ({ ...prev, dataReceived: true }));
        console.log("✅ File ready for download:", fileInfo.fileName);
        }
      }

      // Channel closed = file transfer complete
      channel.onclose = () => {
      
      };
    };

    if (fileInfo) {
      setFileInfo(fileInfo);
    }
    const answer = await createAnswer(offer);
    setStatus((prev) => ({ ...prev, answerSent: true }));
    socket.emit("send-answer", { roomId, answer });
  };

  useEffect(() => {
    if (!socket || !peerRef) return;
    console.log("peerref:", peerRef.current);

    // 🟢 Join the room
    socket.emit("join-room", { roomId, isSender: false });
    socket.on("receive-offer", handleOffer);
    // Setup to receive DataChannel

    return () => socket.off("receive-offer", handleOffer);
  }, [socket, peerRef, roomId]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
        {/* Wifi Indicator */}
        <div
          className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
            isConnected ? "bg-green-500" : "bg-red-400"
          }`}
        >
          <Wifi className="text-white" size={28} />
        </div>

        <h1 className="text-2xl font-bold mt-4 mb-6">P2P File Receiver</h1>

        {/* Download Card */}
        <div className="mt-4 mb-6">
          <DownloadCard fileInfo={fileInfo} downloadUrl={downloadUrl} />
        </div>

        {/* ✅ Connection Status */}
        <div className="text-left">
          <h3 className="font-semibold mb-2 text-gray-700 text-lg">
            {!isSender && "Reciever Connection Status"}
          </h3>
          {[
            ["WebSocket Connected", status.socketConnected],
            ["Joined Room", status.joinedRoom],
            ["Offer Received", status.offerReceived],
            ["Answer Sent", status.answerSent],
            ["ICE Connected", status.iceConnected],
            ["Data Channel Received", status.channelReceived],
            ["Channel Opened", status.channelOpened],
            ["Data Received Successfully", status.dataReceived],
          ].map(([label, done], i) => (
            <div key={i} className="flex items-center gap-2 mb-1">
              <input type="checkbox" checked={done} readOnly />
              <span className={`${done ? "text-green-600" : "text-gray-500"}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Download Icon */}
        <div className="mt-6">
          <Download size={40} className="mx-auto text-indigo-600" />
        </div>
      </div>
    </div>
  );
}
