import { X, Download } from "lucide-react";
import React, { use, useEffect, useState } from "react";

export default function DownloadCard({ onClose, fileInfo, handleDownload }) {
  console.log(fileInfo)

  return (
    <div className="w-[320px] bg-[#2a2b33] rounded-2xl p-4 text-white relative shadow-lg">
      {onClose && (
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      )}

      <div className="mt-2 mb-4">
        <p className="font-medium text-lg truncate">{fileInfo?.fileName || "Receiving file..."}</p>
        <p className="text-sm text-gray-400">{fileInfo?.fileSize || "—"}</p>
        <p className="text-xs text-gray-500 italic">{fileInfo?.fileType || "—"}</p>
      </div>

      {/* Progress bar */}
      {/* {!isComplete && (
        <div className="w-full bg-gray-600 rounded-full h-2 mb-4 overflow-hidden">
          <div
            className="bg-[#f26b1d] h-2 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )} */}

      <button
        onClick={handleDownload}
        // disabled={!downloadUrl}
        className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-white font-medium 
        
        `}
      >
        {/* {isComplete ? "Download" : `Receiving ${progress}%`} */}
        <Download size={18} />
      </button>
    </div>
  );
}
