import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import crypto from 'node:crypto';

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });
const rooms = new Map();

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 3 }, () => chars[crypto.randomInt(chars.length)]).join('');
  return `${part()}-${part()}`;
}

function getRoom(code) {
  if (!rooms.has(code)) rooms.set(code, new Set());
  return rooms.get(code);
}

function broadcast(room, payload, except = null) {
  const message = JSON.stringify(payload);
  for (const client of room) {
    if (client !== except && client.readyState === 1) client.send(message);
  }
}

app.get('/health', (_req, res) => res.json({ ok: true, service: 'ScreenParty' }));
app.get('/room/new', (_req, res) => res.json({ code: makeRoomCode() }));

wss.on('connection', (socket) => {
  socket.id = crypto.randomUUID();
  socket.roomCode = null;
  socket.displayName = 'Convidado';

  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return socket.send(JSON.stringify({ type: 'error', message: 'Mensagem inválida.' }));
    }

    if (message.type === 'join') {
      const code = String(message.room || '').toUpperCase();
      if (!/^([A-Z2-9]{3})-([A-Z2-9]{3})$/.test(code)) {
        return socket.send(JSON.stringify({ type: 'error', message: 'Código de sala inválido.' }));
      }

      socket.roomCode = code;
      socket.displayName = String(message.name || 'Convidado').slice(0, 32);
      const room = getRoom(code);
      room.add(socket);

      const participants = [...room].map((client) => ({ id: client.id, name: client.displayName }));
      socket.send(JSON.stringify({ type: 'joined', room: code, selfId: socket.id, participants }));
      broadcast(room, { type: 'participant-joined', participant: { id: socket.id, name: socket.displayName } }, socket);
      return;
    }

    if (!socket.roomCode) return;
    const room = getRoom(socket.roomCode);

    if (['offer', 'answer', 'ice-candidate'].includes(message.type)) {
      const target = [...room].find((client) => client.id === message.target);
      if (target?.readyState === 1) {
        target.send(JSON.stringify({ ...message, sender: socket.id }));
      }
    }
  });

  socket.on('close', () => {
    if (!socket.roomCode) return;
    const room = rooms.get(socket.roomCode);
    if (!room) return;
    room.delete(socket);
    broadcast(room, { type: 'participant-left', participantId: socket.id });
    if (room.size === 0) rooms.delete(socket.roomCode);
  });
});

const PORT = Number(process.env.PORT || 8787);
httpServer.listen(PORT, () => console.log(`ScreenParty server listening on ${PORT}`));
