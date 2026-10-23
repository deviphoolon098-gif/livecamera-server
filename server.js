const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const rooms = new Map();

const server = new WebSocket.Server({ port: PORT });

server.on('connection', (socket) => {
  let roomCode = null;

  socket.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'join' && typeof data.room === 'string') {
        const code = data.room.trim();

        if (!/^[A-Za-z0-9-]{4,32}$/.test(code)) {
          socket.send(JSON.stringify({ type: 'error', message: 'Invalid room code' }));
          return;
        }

        const room = rooms.get(code) || new Set();

        if (room.size >= 2 || roomCode) {
          socket.send(JSON.stringify({ type: 'error', message: 'Room unavailable' }));
          return;
        }

        room.add(socket);
        rooms.set(code, room);
        roomCode = code;
        socket.send(JSON.stringify({ type: 'joined', room: code }));
        return;
      }

      if (!roomCode) {
        socket.send(JSON.stringify({ type: 'error', message: 'Join a room first' }));
        return;
      }

      const room = rooms.get(roomCode);

      if (room) {
        for (const client of room) {
          if (client !== socket && client.readyState === WebSocket.OPEN) {
            client.send(message.toString());
          }
        }
      }
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
    }
  });

  socket.on('close', () => {
    if (roomCode && rooms.has(roomCode)) {
      const room = rooms.get(roomCode);
      room.delete(socket);
      if (room.size === 0) rooms.delete(roomCode);
    }
  });
});

console.log(`Signaling server listening on port ${PORT}`);
