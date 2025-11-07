import React, { useEffect, useState } from 'react';
import { Upload, Download, Copy, Check, AlertCircle } from 'lucide-react';
import { useWebRTC } from '../provider/WebRTC';

const formatFileSize = (bytes) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getStatusColor = (connection) => {
  switch (connection) {
    case 'connected':
      return 'text-green-600';
    case 'connecting':
      return 'text-yellow-600';
    case 'disconnected':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

const Reciever = () => {
  let webRTCCtx = null;
  try {
    webRTCCtx = useWebRTC();
  } catch (e) {
    webRTCCtx = null;
  }

  const {
    connection,
    progress = 0,
    status,
    fileName,
    fileSize,
    fileType,
    shareUrl,
    joinRoom
  } = webRTCCtx || {};

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    if (roomId) {
      if (joinRoom) joinRoom(roomId);
      else console.warn('WebRTCProvider not found; cannot auto-join room');
    }
  }, [joinRoom]);

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('copy failed', err);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Receiving File
          </h1>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connection === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className={`text-sm font-medium ${getStatusColor(connection)}`}>
              {connection || 'disconnected'}
            </span>
          </div>
        </div>

        {fileName && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <Download className="text-green-600" />
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{fileName}</p>
                <p className="text-sm text-gray-600">{formatFileSize(fileSize)}</p>
                {fileType && (
                  <p className="text-xs text-gray-500 mt-1">Type: {fileType}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {shareUrl && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share this URL with others:
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={shareUrl} 
                readOnly 
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
              <button 
                onClick={copyToClipboard}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {(connection === 'connected' || progress > 0) && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-semibold text-indigo-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {status && (
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
            <AlertCircle className="text-blue-600 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800 mb-1">Status</p>
              <p className="text-sm text-gray-600">{status}</p>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong> Files are transferred directly between peers using WebRTC. 
            No data is uploaded to any server. The connection is peer-to-peer and secure.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Reciever