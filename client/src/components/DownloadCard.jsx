import { X, Download } from "lucide-react";
import React from "react";

export default function DownloadCard({ onClose, fileInfo }) {
  const { fileName, fileSize, fileType } = fileInfo || {};

  const formatSize = (bytes) => {
    if (!bytes) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const onDownload = () => {
    console.log("📥 Download clicked");
  };

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
        <p className="font-medium text-lg">
          {fileName || "Waiting for sender..."}
        </p>
        <p className="text-sm text-gray-400">
          {fileSize ? formatSize(fileSize) : "—"}
        </p>
        <p className="text-xs text-gray-500 italic">{fileType || ""}</p>
      </div>

      {/* Download Button */}
      <button
        onClick={onDownload}
        disabled={!fileInfo}
        className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors duration-300 ${
          fileInfo
            ? "bg-[#f26b1d] hover:bg-[#e55c0f] text-white"
            : "bg-gray-500 cursor-not-allowed text-gray-300"
        }`}
      >
        Download <Download size={18} />
      </button>
    </div>
  );
}
