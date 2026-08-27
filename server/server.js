import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });
const rooms = new Map();
const ROOM_RE = /^([A-Z2-9]{3})-([A-Z2-9]{3})$/;

app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, '../web'), { extensions: ['html'] }));

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    const part = () => Array.from({ length: 3 }, () => chars[crypto.randomInt(chars.length)]).join('');
    code = `${part()}-${part()}`;
  } while (rooms.has(code));
  return code;
}

function getRoom(code) {
  if (!rooms.has(code)) rooms.set(code, new Set());
  return rooms.get(code);
}

function participantOf(socket) {
  return { id: socket.id, name: socket.displayName };
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
      socket.send(JSON.stringify({ type: 'error', message: 'Mensagem inválida.' }));
      return;
    }

    if (message.type === 'join') {
      if (socket.roomCode) return;
      const code = String(message.room || '').toUpperCase();
      if (!ROOM_RE.test(code)) {
        socket.send(JSON.stringify({ type: 'error', message: 'Código de sala inválido.' }));
        return;
      }

      socket.roomCode = code;
      socket.displayName = String(message.name || 'Convidado').trim().slice(0, 32) || 'Convidado';
      const room = getRoom(code);
      room.add(socket);

      socket.send(JSON.stringify({
        type: 'joined',
        room: code,
        selfId: socket.id,
        participants: [...room].map(participantOf)
      }));
      broadcast(room, { type: 'participant-joined', participant: participantOf(socket) }, socket);
      return;
    }

    if (!socket.roomCode) return;
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    if (['offer', 'answer', 'ice-candidate'].includes(message.type)) {
      const targetId = String(message.target || '');
      const target = [...room].find((client) => client.id === targetId);
      if (target?.readyState === 1) {
        target.send(JSON.stringify({ ...message, sender: socket.id }));
      }
      return;
    }

    if (message.type === 'chat') {
      const text = String(message.text || '').trim().slice(0, 500);
      if (!text) return;
      broadcast(room, { type: 'chat', from: participantOf(socket), text });
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
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`ScreenParty listening on port ${PORT}`);
});
