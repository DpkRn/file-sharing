import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { parse } from 'url';

const PORT = 3001;

// Store active rooms and connections
const rooms = new Map();

// Create HTTP server
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebRTC Signaling Server Running\n');
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const params = parse(req.url, true).query;
  const roomId = params.room;
  const role = params.role; 
 
  if (!roomId) {
    ws.close(1008, 'Room ID required');
    return;
  }

  console.log(`${roomId} : ${role} --> connected`);

  // Initialize room if doesn't exist
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      sender: null,
      receiver: null,
      createdAt: Date.now()
    });
  }

  const room = rooms.get(roomId);

  // Assign connection to room
  if (role === 'sender') {
    if (room.sender) {
      ws.close(1008, 'Sender already exists');
      return;
    }
    room.sender = ws;
  } else if (role === 'receiver') {
    if (room.receiver) {
      ws.close(1008, 'Receiver already exists');
      return;
    }
    room.receiver = ws;
  } else {
    ws.close(1008, 'Invalid role');
    return;
  }


  // Handle messages - relay to the other peer
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log("description:",data)
      console.log(`[${roomId}] ${role} sent: type: ${data.type} `);

      const otherPeer = role === 'sender' ? room.receiver : room.sender;
      
      if (otherPeer && otherPeer.readyState === 1) { // 1 = OPEN
        otherPeer.send(message);
        console.log(`[${roomId}] Relayed ${data.type} to ${role === 'sender' ? 'receiver' : 'sender'}`);
      } else {
        console.log(`[${roomId}] Other peer not connected yet`);
      }
    } catch (error) {
      console.error(`[${roomId}] Error processing message:`, error);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log(`[${roomId}] ${role} disconnected`);
    
    if (role === 'sender') {
      room.sender = null;
    } else if (role === 'receiver') {
      room.receiver = null;
    }

    // Clean up room if both peers disconnected
    if (!room.sender && !room.receiver) {
      console.log(`[${roomId}] Room cleaned up`);
      rooms.delete(roomId);
    }
  });

  ws.on('error', (error) => {
    console.error(`[${roomId}] WebSocket error:`, error);
  });
});

// Clean up stale rooms (older than 1 hour)
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.createdAt > oneHour) {
      console.log(`[${roomId}] Cleaning up stale room`);
      if (room.sender) room.sender.close();
      if (room.receiver) room.receiver.close();
      rooms.delete(roomId);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

server.listen(PORT, () => {
  console.log(`WebRTC Signaling Server listening on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  wss.close(() => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});