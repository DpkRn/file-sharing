const express = require("express");
const { Server } = require("socket.io");

const app = express();
const rooms = new Map();

const io = new Server(8001, { cors: { origin: "*" } });
app.listen(8000, () => console.log("✅ Express on port 8000"));

io.on("connection", (socket) => {
  console.log("⚡ Connected:", socket.id);

  socket.on("join-room", ({ roomId, isSender }) => {
    if (!rooms.has(roomId)) rooms.set(roomId, {});
    const room = rooms.get(roomId);
    room[isSender ? "sender" : "receiver"] = socket.id;
    socket.join(roomId);
    console.log(`📦 ${socket.id} joined room ${roomId}`);
  });

  socket.on("send-offer", ({ roomId, offer, fileInfo }) => {
    socket.to(roomId).emit("receive-offer", { offer, fileInfo });
  });

  socket.on("send-answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("receive-answer", { answer });
  });

  socket.on("ice-candidate", (candidate) => {
    socket.broadcast.emit("ice-candidate", candidate);
  });
});
