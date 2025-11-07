import React, { useRef, useState } from "react";
import { Wifi, Upload, Copy, Check } from "lucide-react";
import { useSocket } from "../context/SocketProvider";
import { useWebRTC } from "../context/WebRTCProvider";

const Sender = () => {
  const [file, setFile] = useState(null);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const { socket, isConnected } = useSocket();
  const { peerRef, createPeerConnection, createDataChannel, sendData } = useWebRTC();

  const fileRef = useRef(null);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    const roomId = generateRoomId();
    const url = `${window.location.origin}/share/${roomId}`;
    setShareUrl(url);

    socket.emit("join-room", { roomId, isSender: true, fileInfo: getFileInfo(selectedFile) });

    const peer = createPeerConnection();
    createDataChannel("fileChannel", (data) => console.log("Receiver:", data));

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socket.emit("send-offer", { roomId, offer, fileInfo: getFileInfo(selectedFile) });
  };

  socket.on("receive-answer", async ({ answer }) => {
    if (peerRef.current) await peerRef.current.setRemoteDescription(answer);
    console.log("✅ Answer received from receiver");
  });

  const getFileInfo = (file) => ({
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  });

  const generateRoomId = () =>
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className={`w-16 h-16 ${isConnected ? "bg-green-500" : "bg-red-400"} rounded-full mx-auto flex items-center justify-center`}>
          <Wifi className="text-white" size={32} />
        </div>
        <h1 className="text-3xl font-bold my-4">P2P File Share</h1>
        <label className="block cursor-pointer border-2 border-dashed p-8 rounded-xl hover:bg-indigo-50">
          <Upload className="mx-auto text-indigo-600 mb-4" size={48} />
          <p>Select a file to share</p>
          <input type="file" onChange={handleFileSelect} className="hidden" />
        </label>

        {shareUrl && (
          <div className="mt-4">
            <input value={shareUrl} readOnly className="border p-2 rounded w-full text-sm" />
            <button
              onClick={copyToClipboard}
              className="mt-2 w-full bg-indigo-600 text-white rounded-lg py-2 flex justify-center items-center gap-2"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sender;
