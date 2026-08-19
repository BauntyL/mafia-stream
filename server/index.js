import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createRoom,
  joinRoom,
  reconnectPlayer,
  getRoom,
  setHost,
  voteForHost,
  setCamera,
  startGame,
  advanceRoleReveal,
  submitNightAction,
  advanceNightPhase,
  resolveNight,
  startVoting,
  submitVote,
  resolveVoting,
  serializeRoom,
  removePlayer,
} from './rooms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

function emitRoomUpdate(room) {
  const code = room.code;
  io.to(code).emit('roomUpdate', serializeRoom(room));
  room.players.forEach((p) => {
    if (p.socketId) {
      io.to(p.socketId).emit('roomUpdatePrivate', serializeRoom(room, p.id));
    }
  });
  io.to(`${code}_overlay`).emit('roomUpdateOverlay', serializeRoom(room, null, true));
}

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentPlayerId = null;

  socket.on('createRoom', ({ nickname }, cb) => {
    const { room, player } = createRoom(nickname, socket.id);
    currentRoom = room.code;
    currentPlayerId = player.id;
    socket.join(room.code);
    cb?.({ success: true, room: serializeRoom(room, player.id), playerId: player.id });
    emitRoomUpdate(room);
  });

  socket.on('joinRoom', ({ code, nickname }, cb) => {
    const result = joinRoom(code, nickname, socket.id);
    if (result.error) {
      cb?.({ success: false, error: result.error });
      return;
    }
    const { room, player } = result;
    currentRoom = room.code;
    currentPlayerId = player.id;
    socket.join(room.code);
    cb?.({ success: true, room: serializeRoom(room, player.id), playerId: player.id });
    emitRoomUpdate(room);
  });

  socket.on('reconnect', ({ code, playerId }, cb) => {
    const result = reconnectPlayer(code, playerId, socket.id);
    if (result.error) {
      cb?.({ success: false, error: result.error });
      return;
    }
    const { room, player } = result;
    currentRoom = room.code;
    currentPlayerId = player.id;
    socket.join(room.code);
    cb?.({ success: true, room: serializeRoom(room, player.id), playerId: player.id });
    emitRoomUpdate(room);
  });

  socket.on('joinOverlay', ({ code }) => {
    socket.join(`${code.toUpperCase()}_overlay`);
    const room = getRoom(code);
    if (room) {
      socket.emit('roomUpdateOverlay', serializeRoom(room, null, true));
    }
  });

  socket.on('setHost', ({ playerId }) => {
    const room = getRoom(currentRoom);
    if (!room) return;
    const requester = room.players.find((p) => p.id === currentPlayerId);
    if (!requester?.isCreator && !requester?.isHost) return;
    setHost(room, playerId);
    emitRoomUpdate(room);
  });

  socket.on('voteHost', ({ playerId }) => {
    const room = getRoom(currentRoom);
    if (!room || room.phase !== 'lobby') return;
    voteForHost(room, currentPlayerId, playerId);
    emitRoomUpdate(room);
  });

  socket.on('setCamera', ({ streamId, viewUrl }) => {
    const room = getRoom(currentRoom);
    if (!room) return;
    setCamera(room, currentPlayerId, streamId, viewUrl);
    emitRoomUpdate(room);
  });

  socket.on('updateSettings', ({ settings }) => {
    const room = getRoom(currentRoom);
    if (!room) return;
    const requester = room.players.find((p) => p.id === currentPlayerId);
    if (!requester?.isHost) return;
    room.settings = { ...room.settings, ...settings };
    emitRoomUpdate(room);
  });

  socket.on('startGame', (_, cb) => {
    const room = getRoom(currentRoom);
    if (!room) return;
    const requester = room.players.find((p) => p.id === currentPlayerId);
    if (!requester?.isHost) {
      cb?.({ success: false, error: 'Только ведущий может начать игру' });
      return;
    }
    const result = startGame(room);
    if (result.error) {
      cb?.({ success: false, error: result.error });
      return;
    }
    cb?.({ success: true });
    emitRoomUpdate(room);
  });

  socket.on('advanceRoleReveal', () => {
    const room = getRoom(currentRoom);
    if (!room || room.phase !== 'roleReveal') return;
    advanceRoleReveal(room);
    emitRoomUpdate(room);
  });

  socket.on('hostAdvanceNight', () => {
    const room = getRoom(currentRoom);
    if (!room) return;
    const requester = room.players.find((p) => p.id === currentPlayerId);
    if (!requester?.isHost) return;
    advanceNightPhase(room);
    emitRoomUpdate(room);
  });

  socket.on('hostResolveNight', () => {
    const room = getRoom(currentRoom);
    if (!room) return;
    const requester = room.players.find((p) => p.id === currentPlayerId);
    if (!requester?.isHost) return;
    resolveNight(room);
    emitRoomUpdate(room);
  });

  socket.on('hostStartVoting', () => {
    const room = getRoom(currentRoom);
    if (!room) return;
    const requester = room.players.find((p) => p.id === currentPlayerId);
    if (!requester?.isHost) return;
    startVoting(room);
    emitRoomUpdate(room);
  });

  socket.on('hostResolveVoting', () => {
    const room = getRoom(currentRoom);
    if (!room) return;
    const requester = room.players.find((p) => p.id === currentPlayerId);
    if (!requester?.isHost) return;
    resolveVoting(room);
    emitRoomUpdate(room);
  });

  socket.on('nightAction', ({ targetId }, cb) => {
    const room = getRoom(currentRoom);
    if (!room) return;
    const result = submitNightAction(room, currentPlayerId, targetId);
    if (result.error) {
      cb?.({ success: false, error: result.error });
      return;
    }
    cb?.({ success: true, checkResult: result.checkResult });
    emitRoomUpdate(room);
  });

  socket.on('vote', ({ targetId }, cb) => {
    const room = getRoom(currentRoom);
    if (!room) return;
    const result = submitVote(room, currentPlayerId, targetId);
    if (result.error) {
      cb?.({ success: false, error: result.error });
      return;
    }
    cb?.({ success: true });
    emitRoomUpdate(room);
  });

  socket.on('disconnect', () => {
    const room = removePlayer(socket.id);
    if (room) emitRoomUpdate(room);
  });
});

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok' });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (_, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// 0.0.0.0 обязателен для облачных хостингов (Render, Railway)
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Mafia server running on port ${PORT}`);
});
