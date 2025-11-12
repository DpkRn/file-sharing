import { X, Download } from "lucide-react";
import React, { use, useEffect, useState } from "react";

export default function DownloadCard({ onClose, fileInfo, incomingChunks,downloadUrl }) {
  const { fileName, fileSize, fileType } = fileInfo || {};
  const [progress, setProgress] = useState(0);
  // const [downloadUrl, setDownloadUrl] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  const formatSize = (bytes) => {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  };

  // 🧠 Assemble file once all chunks are received

  useEffect(()=>{
    setIsComplete(downloadUrl?true:false)
  },[downloadUrl])
  
  const handleDownload = () => {
    if (!downloadUrl) return;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName || "downloaded-file";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-[320px] bg-[#2a2b33] rounded-2xl p-4 text-white relative shadow-lg">
      {onClose && (
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      )}

      <div className="mt-2 mb-4">
        <p className="font-medium text-lg truncate">{fileName || "Receiving file..."}</p>
        <p className="text-sm text-gray-400">{fileSize ? formatSize(fileSize) : "—"}</p>
        <p className="text-xs text-gray-500 italic">{fileType || "—"}</p>
      </div>

      {/* Progress bar */}
      {!isComplete && (
        <div className="w-full bg-gray-600 rounded-full h-2 mb-4 overflow-hidden">
          <div
            className="bg-[#f26b1d] h-2 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <button
        onClick={handleDownload}
        disabled={!downloadUrl}
        className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-white font-medium ${
          isComplete
            ? "bg-[#f26b1d] hover:bg-[#e55c0f]"
            : "bg-gray-500 cursor-not-allowed"
        }`}
      >
        {isComplete ? "Download" : `Receiving ${progress}%`}
        <Download size={18} />
      </button>
    </div>
  );
}
