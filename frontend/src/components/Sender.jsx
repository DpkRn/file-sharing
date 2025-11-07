import React from 'react'

const Sender = () => {


     const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };



  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const getStatusColor = () => {
    if (connection === 'connected') return 'text-green-600';
    if (connection === 'connecting') return 'text-yellow-600';
    if (connection === 'failed' || connection === 'disconnected') return 'text-red-600';
    return 'text-gray-600';
  };


      const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      fileRef.current = file;
      setFileName(file.name);
      setFileSize(file.size);
      setMode('send');
      initializeSender(file);
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
            </div>
          </div>
  )
}

export default Sender