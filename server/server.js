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
    rooms.set(roomId, { sender: socket.id, senderIceCandidates: [] });
  }
  if (!isSender && rooms.has(roomId)) {
    const room = rooms.get(roomId);
    rooms.set(roomId, { ...room, receiver: socket.id });

    // Send stored offer if available
    if (room.offer) {
      console.log("has offer")
      socket.emit("receive-offer", { offer: room.offer, fileInfo: room.fileInfo });
    }

    // Send all buffered ICE candidates
    console.log("candidates:",room.senderIceCandidates)
    room.senderIceCandidates?.forEach(c => {
      if (c) socket.emit("ice-candidate", { candidate: c });
    });
  }

  socket.to(roomId).emit("reciever-joined");
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

socket.on("ice-candidate", ({ roomId, candidate, isSender }) => {

  if (!candidate) return; // ignore null
  console.log("candidate is not null")
  const room = rooms.get(roomId);
  console.log("rooms:",roomId,room)
  if (!room) return;

  if (isSender) {
    console.log("comming as sender")
    if (!room.senderIceCandidates) room.senderIceCandidates = [];
      room.senderIceCandidates.push(candidate);
  } else {
    console.log("comming as reciever")
    if (!room.receiverIceCandidates) room.receiverIceCandidates = [];
    room.receiverIceCandidates.push(candidate);
  }
  console.log(room)

  socket.to(roomId).emit("ice-candidate", { candidate });
});

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

server.listen(PORT, "0.0.0.0", () =>
  console.log("✅ Server running on port 8001")
);
