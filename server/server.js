import express from "express";
import { Server } from "socket.io";
import http from "http";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const PORT = process.env.PORT || 8001;

app.get("/greet", (req, res) => {
  res.status(200).send("welcome");
});

const rooms = new Map(); // 🧠 keep track of offers until receiver joins

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("join-room", ({ roomId, isSender }) => {
    socket.join(roomId);

    if (isSender && !rooms.has(roomId)) {
      rooms.set(roomId, { sender: socket.id });
    }
    if (!isSender && rooms.has(roomId)) {
      // Receiver just joined — send stored offer
      const room = rooms.get(roomId);
      rooms.set(roomId, { ...room, receiver: socket.id });
      const { offer, fileInfo } = room;
      socket.emit("receive-offer", { offer, fileInfo });
    }
    socket.emit("joined-room", { roomId });
  });

  socket.on("send-offer", ({ roomId, offer, fileInfo }) => {
    const room = rooms.get(roomId);
    if (room) {
      rooms.set(roomId, { ...room, offer, fileInfo });
    }

    // if receiver already joined, send immediately
    socket.to(roomId).emit("receive-offer", { offer, fileInfo });
  });

  socket.on("send-answer", ({ roomId, answer }) => {
    const room = rooms.get(roomId);
    rooms.set(roomId, { ...room, answer });
    socket.to(roomId).emit("receive-answer", { answer });
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", candidate);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

server.listen(PORT, "0.0.0.0", () =>
  console.log("✅ Server running on port 8001")
);
