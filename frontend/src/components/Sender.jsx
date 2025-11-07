import React, { useRef } from 'react';
import { Upload, Wifi } from 'lucide-react';
import { useWebRTC } from '../provider/WebRTC';

const Sender = () => {

  let webRTCCtx = null;
  try {
    webRTCCtx = useWebRTC();
  } catch (e) {
    console.log("webRTC provider not wrapped")
  }

  const { startSender, shareUrl, status, connection, progress } = webRTCCtx || {};

  const fileRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      fileRef.current = file;
      if (startSender) startSender(file);
      else alert('WebRTCProvider not found. Wrap your app with <WebRTCProvider> and <SocketProvider>.');
    }
  };



  

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wifi className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">P2P File Share</h1>
          <p className="text-gray-600">Direct peer-to-peer file transfer using WebRTC</p>
        </div>

        <label className="block">
          <div className="border-2 border-dashed border-indigo-300 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition">
            <Upload className="mx-auto text-indigo-600 mb-4" size={48} />
            <p className="text-lg font-semibold text-gray-700 mb-2">Choose File to Share</p>
            <p className="text-sm text-gray-500">Supports files up to 50GB+</p>
            <input
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </label>

        {shareUrl && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">Share this URL with receiver:</p>
            <p className="text-sm text-indigo-600 break-all">{shareUrl}</p>
          </div>
        )}

        {status && (
          <div className="mt-4 text-center text-sm text-gray-700">{status}</div>
        )}
      </div>
    </div>
  );
};

export default Sender;