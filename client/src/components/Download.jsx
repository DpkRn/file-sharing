import { X, Download } from "lucide-react"; // or use any icon library
import React from "react";
import { useSocket } from "../providers/SocketProvider";
import { useEffect,useState } from "react";

export default function DownloadCard({onClose}) {
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [fileType, setFileType] = useState("");

  const {socket,isConnected}=useSocket();


   useEffect(()=>{
    socket.on("user-joined", (data) => {
    const { roomID, fileName, fileType, fileSize, isSender } = data;
    setFileName(fileName)
    setFileSize(fileSize)
    setFileType(fileType)
    console.log(data)
    }); 
   },[socket])

   const onDownload=()=>{
    console.log("download")
   }


  return (
    <div className="w-[320px] bg-[#2a2b33] rounded-2xl shadow-lg p-4 relative text-white">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-200 transition"
      >
        <X size={20} />
      </button>

      {/* File Info */}
      <div className="mt-2 mb-4">
        <p className="font-medium text-lg">{fileName}</p>
        <p className="text-sm text-gray-400">{fileSize}</p>
      </div>

      {/* Download Button */}
      <button
        onClick={onDownload}
        className="w-full bg-[#f26b1d] hover:bg-[#e55c0f] text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors duration-300"
      >
        Download <Download size={18} />
      </button>
    </div>
  );
}
