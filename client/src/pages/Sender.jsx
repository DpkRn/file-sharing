import React, { useState, useEffect } from "react";
import { Wifi, Upload, Copy, Check } from "lucide-react";
import { useSocket } from "../context/SocketProvider";
import { useWebRTC } from "../context/WebRTCProvider";
import { copyToClipboard, generateRoomId, getFileInfo } from "../utils";

const CHUNK_SIZE = 16 * 1024; // 16 KB per chunk

export default function Sender() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const { socket, setRoomId, isConnected, isSender } = useSocket();
  const { createOffer, createDataChannel, sendData, peerRef, isIceConnected } =
    useWebRTC();

  const [status, setStatus] = useState({
    socketConnected: false,
    channelCreated: false,
    joinedRoom: false,
    offerCreated: false,
    offerSent: false,
    offerAccepted: false,
    answerReceived: false,
    iceConnected: false,
    channelOpened: false,
    dataSent: false,
  });

  // 🧠 When WebSocket connects
  useEffect(() => {
    setStatus((prev) => ({ ...prev, socketConnected: isConnected }));
    setStatus((prev) => ({ ...prev, iceConnected: isIceConnected }));
  }, [isConnected, isIceConnected]);

  // 🧩 File Sending Logic
  const sendFile = async (file, dc) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let offset = 0;

    while (offset < file.size) {
      const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
      sendData(chunk);
      offset += CHUNK_SIZE;
      setProgress(Math.round((offset / file.size) * 100));
    }

    // ✅ Notify receiver file is done
    dc.send(JSON.stringify({ done: true }));
    console.log("✅ File sent completely");
    setStatus((prev) => ({ ...prev, dataSent: true }));
  };

  // 📂 Handle File Selection
  const handleFileSelect = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);

    const roomId = generateRoomId();
    setRoomId(roomId);
    setShareUrl(`${window.location.origin}/share/${roomId}`);

    socket.emit("join-room", { roomId: roomId, isSender: true });
    setStatus((prev) => ({ ...prev, joinedRoom: true }));

    // socket.on("reciever-joined", async () => {
      const dc = createDataChannel();
      setStatus((prev) => ({ ...prev, channelCreated: true }));

      // Create & send offer
      const offer = await createOffer();
      setStatus((prev) => ({ ...prev, offerCreated: true }));

      socket.emit("send-offer", {
        roomId: roomId,
        offer,
        fileInfo: getFileInfo(f),
      });
      setStatus((prev) => ({ ...prev, offerSent: true }));

      socket.on("receive-answer", async ({ answer }) => {
        if (!answer) return;
        await peerRef.current.setRemoteDescription(answer);
        setStatus((prev) => ({ ...prev, offerAccepted: true }));
        console.log("🎯 Answer received, ready to send file");
        setStatus((prev) => ({ ...prev, answerReceived: true }));
        // When Data Channel opens → send file
        dc.onopen = () => {
          setStatus((prev) => ({ ...prev, channelOpened: true }));
          sendFile(f, dc);
        };
      });
    // });
    peerRef.current.onicecandidate = (e) => {
      console.log("iceCandidate done:",e.candidate)
      if (e.candidate) {
        console.log(e.candidate)
        console.log("roomID:",roomId)
          socket.emit("ice-candidate", { roomId, candidate: e.candidate,isSender })
      }
    };

    // When answer received
  };

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

        <h1 className="text-2xl font-bold mt-4 mb-6">P2P File Sender</h1>

        {/* File Upload */}
        <label className="cursor-pointer  rounded-xl p-8 hover:bg-indigo-50">
          <Upload className="mx-auto text-indigo-600 mb-3" size={40} />
          <p>Select a file to share</p>
          <input type="file" hidden onChange={handleFileSelect} />
        </label>

        {/* Progress */}
        {file && <p className="mt-3 text-gray-700">Sending: {progress}%</p>}

        {/* Share Link */}
        {shareUrl && (
          <div className="mt-5">
            <input
              value={shareUrl}
              readOnly
              className="border p-2 rounded w-full text-sm"
            />
            <button
              onClick={() => copyToClipboard(shareUrl, setCopied)}
              className="mt-2 w-full bg-indigo-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        )}

        {/* ✅ Connection Progress */}
        <div className="mt-6 text-left">
          <h3 className="font-semibold mb-2 text-gray-700 text-lg">
            {isSender && "Sender Connection Status"}
          </h3>
          {[
            ["WebSocket Connected", status.socketConnected],
            ["Joined Room", status.joinedRoom],
            ["Data Channel Created", status.channelCreated],
            ["Offer Created", status.offerCreated],
            ["Offer Sent", status.offerSent],
            ["Offer Accepted by Peer", status.offerAccepted],
            ["Answer Received", status.answerReceived],
            ["ICE Connected", status.iceConnected],
            ["Channel Opened", status.channelOpened],
            ["Data Sent Successfully", status.dataSent],
          ].map(([label, done], i) => (
            <div key={i} className="flex items-center gap-2 mb-1">
              <input type="checkbox" checked={done} readOnly />
              <span className={`${done ? "text-green-600" : "text-gray-500"}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
