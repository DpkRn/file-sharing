export const copyToClipboard = (shareUrl,setCopied) => {
  navigator.clipboard.writeText(shareUrl);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

export const generateRoomId = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

export const getFileInfo = (file) => ({
  fileName: file.name,
  fileSize: file.size,
  fileType: file.type,
});
