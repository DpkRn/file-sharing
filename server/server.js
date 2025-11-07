import express from "express";
import { Server } from "socket.io";
import http from "http";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.get('/greet',(req,res)=>{
  res.send("welcome")
})
const rooms = new Map(); // 🧠 keep track of offers until receiver joins

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("join-room", ({ roomId, isSender }) => {
    socket.join(roomId);
    console.log(`👥 ${isSender ? "Sender" : "Receiver"} joined room: ${roomId}`);

    if (!isSender && rooms.has(roomId)) {
      // Receiver just joined — send stored offer
      const { offer, fileInfo } = rooms.get(roomId);
      socket.emit("receive-offer", { offer, fileInfo });
    }
  });

  socket.on("send-offer", ({ roomId, offer, fileInfo }) => {
    console.log("📡 Offer stored for room:", roomId);
    rooms.set(roomId, { offer, fileInfo });

    // if receiver already joined, send immediately
    socket.to(roomId).emit("receive-offer", { offer, fileInfo });
  });

  socket.on("send-answer", ({ roomId, answer }) => {
    console.log("📨 Answer received for room:", roomId);
    socket.to(roomId).emit("receive-answer", { answer });
  });

  //   socket.on("ice-candidate", (candidate) => {
  //   socket.broadcast.emit("ice-candidate", candidate);
  // });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

server.listen(8001, () => console.log("✅ Server running on port 8001"));
