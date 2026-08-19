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
  setReady,
  kickPlayer,
  addBot,
  removeBots,
  startGame,
  restartGame,
  markRoleSeen,
  startNight,
  submitNightAction,
  advanceNightPhase,
  isStepComplete,
  resolveNight,
  nextSpeaker,
  clearSpeaker,
  startVoting,
  submitVote,
  resolveVoting,
  addChatMessage,
  startTimer,
  stopTimer,
  serializeRoom,
  removePlayer,
  cleanupRooms,
  pushLog,
  checkWinNow,
} from './rooms.js';
import { runBots } from './bots.js';

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

/** Подтверждаем каждое событие: иначе промис на клиенте не разрешится никогда. */
function done(cb, room) {
  if (room) emitRoomUpdate(room);
  cb?.({ success: !!room });
}

function emitRoomUpdate(room) {
  if (!room) return;
  const code = room.code;
  // Каждому игроку уходит своя версия состояния: чужие роли и тайный чат он видеть не должен
  room.players.forEach((p) => {
    if (p.socketId) {
      io.to(p.socketId).emit('roomUpdatePrivate', serializeRoom(room, p.id));
    }
  });
  io.to(`${code}_overlay`).emit('roomUpdateOverlay', serializeRoom(room, null, true));
  scheduleBots(room);
}

const botTimers = new Map();

/** Боты ходят по одному с задержкой; цикл сам останавливается, когда ходить некому. */
function scheduleBots(room) {
  if (botTimers.has(room.code)) return;
  if (!room.players.some((p) => p.isBot)) return;

  const timer = setTimeout(() => {
    botTimers.delete(room.code);
    const fresh = getRoom(room.code);
    if (!fresh) return;
    if (runBots(fresh)) emitRoomUpdate(fresh);
  }, 700 + Math.floor(Math.random() * 700));

  botTimers.set(room.code, timer);
}

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentPlayerId = null;

  const ctx = () => {
    const room = getRoom(currentRoom);
    if (!room) return {};
    const player = room.players.find((p) => p.id === currentPlayerId);
    return { room, player };
  };

  const hostCtx = () => {
    const { room, player } = ctx();
    if (!room || !player?.isHost) return {};
    return { room, player };
  };

  socket.on('createRoom', ({ nickname }, cb) => {
    const name = String(nickname || '').trim();
    if (!name) {
      cb?.({ success: false, error: 'Введите никнейм' });
      return;
    }
    const { room, player } = createRoom(name, socket.id);
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
    const key = String(code || '').toUpperCase();
    socket.join(`${key}_overlay`);
    const room = getRoom(key);
    if (room) socket.emit('roomUpdateOverlay', serializeRoom(room, null, true));
  });

  /* ── Лобби ─────────────────────────────────────────────── */

  socket.on('setHost', ({ playerId }, cb) => {
    const { room, player } = ctx();
    if (!room || (!player?.isCreator && !player?.isHost)) return done(cb);
    setHost(room, playerId);
    done(cb, room);
  });

  socket.on('voteHost', ({ playerId }, cb) => {
    const { room } = ctx();
    if (!room || room.phase !== 'lobby') return done(cb);
    voteForHost(room, currentPlayerId, playerId);
    done(cb, room);
  });

  socket.on('setReady', ({ ready }, cb) => {
    const { room } = ctx();
    if (!room) return done(cb);
    setReady(room, currentPlayerId, ready);
    done(cb, room);
  });

  socket.on('kickPlayer', ({ playerId }, cb) => {
    const { room } = hostCtx();
    if (!room) return done(cb);
    const kicked = kickPlayer(room, playerId);
    if (kicked?.socketId) io.to(kicked.socketId).emit('kicked');
    done(cb, room);
  });

  socket.on('addBot', (_, cb) => {
    const { room } = hostCtx();
    if (!room) return done(cb);
    const result = addBot(room);
    if (result.error) {
      cb?.({ success: false, error: result.error });
      return;
    }
    done(cb, room);
  });

  socket.on('removeBots', (_, cb) => {
    const { room } = hostCtx();
    if (!room) return done(cb);
    removeBots(room);
    done(cb, room);
  });

  socket.on('setCamera', ({ streamId, viewUrl }, cb) => {
    const { room } = ctx();
    if (!room) return done(cb);
    setCamera(room, currentPlayerId, streamId, viewUrl);
    done(cb, room);
  });

  socket.on('updateSettings', ({ settings }, cb) => {
    const { room } = hostCtx();
    if (!room) return done(cb);
    room.settings = { ...room.settings, ...settings };
    done(cb, room);
  });

  /* ── Ход партии ────────────────────────────────────────── */

  socket.on('startGame', (_, cb) => {
    const { room } = hostCtx();
    if (!room) {
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

  socket.on('restartGame', (_, cb) => {
    const { room } = hostCtx();
    if (!room) return done(cb);
    restartGame(room);
    done(cb, room);
  });

  socket.on('roleSeen', (_, cb) => {
    const { room } = ctx();
    if (!room || room.phase !== 'roleReveal') return done(cb);
    markRoleSeen(room, currentPlayerId);
    done(cb, room);
  });

  socket.on('hostStartNight', (_, cb) => {
    const { room } = hostCtx();
    if (!room || room.phase !== 'roleReveal') return done(cb);
    startNight(room);
    done(cb, room);
  });

  socket.on('hostAdvanceNight', (_, cb) => {
    const { room } = hostCtx();
    if (!room) return done(cb);
    advanceNightPhase(room);
    done(cb, room);
  });

  socket.on('hostResolveNight', (_, cb) => {
    const { room } = hostCtx();
    if (!room || room.phase !== 'night') return done(cb);
    resolveNight(room);
    done(cb, room);
  });

  socket.on('hostNextSpeaker', (_, cb) => {
    const { room } = hostCtx();
    if (!room) return done(cb);
    nextSpeaker(room);
    done(cb, room);
  });

  socket.on('hostClearSpeaker', (_, cb) => {
    const { room } = hostCtx();
    if (!room) return done(cb);
    clearSpeaker(room);
    done(cb, room);
  });

  socket.on('hostStartVoting', (_, cb) => {
    const { room } = hostCtx();
    if (!room || room.phase !== 'day') return done(cb);
    startVoting(room);
    done(cb, room);
  });

  socket.on('hostResolveVoting', (_, cb) => {
    const { room } = hostCtx();
    if (!room || room.phase !== 'voting') return done(cb);
    resolveVoting(room);
    done(cb, room);
  });

  socket.on('hostTimer', ({ action, seconds, label }, cb) => {
    const { room } = hostCtx();
    if (!room) return done(cb);
    if (action === 'stop') stopTimer(room);
    else startTimer(room, seconds, label);
    done(cb, room);
  });

  socket.on('hostForceKill', ({ playerId, reason }, cb) => {
    const { room } = hostCtx();
    if (!room || room.phase === 'lobby') return done(cb);
    const target = room.players.find((p) => p.id === playerId);
    if (!target || target.isHost || !target.alive) return done(cb);
    target.alive = false;
    target.deathReason = reason === 'voted' ? 'voted' : 'killed';
    target.deathPhase = room.phase === 'night' ? 'night' : 'day';
    target.deathDay = room.dayNumber;
    pushLog(room, `Ведущий вывел из игры ${target.nickname}`, 'blood');
    checkWinNow(room);
    done(cb, room);
  });

  /* ── Действия игроков ──────────────────────────────────── */

  socket.on('nightAction', ({ targetId }, cb) => {
    const { room } = ctx();
    if (!room) {
      cb?.({ success: false, error: 'Комната не найдена' });
      return;
    }
    const result = submitNightAction(room, currentPlayerId, targetId);
    if (result.error) {
      cb?.({ success: false, error: result.error });
      return;
    }
    cb?.({ success: true, checkResult: result.checkResult, skipped: result.skipped });
    emitRoomUpdate(room);

    if (room.settings.autoAdvanceNight && room.phase === 'night') {
      setTimeout(() => {
        const fresh = getRoom(room.code);
        if (!fresh || fresh.phase !== 'night') return;
        if (fresh.nightSubPhase === 'resolve') return;
        if (!isStepComplete(fresh)) return;
        advanceNightPhase(fresh);
        emitRoomUpdate(fresh);
      }, 1500);
    }
  });

  socket.on('vote', ({ targetId }, cb) => {
    const { room } = ctx();
    if (!room) {
      cb?.({ success: false, error: 'Комната не найдена' });
      return;
    }
    const result = submitVote(room, currentPlayerId, targetId);
    if (result.error) {
      cb?.({ success: false, error: result.error });
      return;
    }
    cb?.({ success: true, skipped: result.skipped });
    emitRoomUpdate(room);
  });

  socket.on('chat', ({ text }, cb) => {
    const { room } = ctx();
    if (!room) return;
    const result = addChatMessage(room, currentPlayerId, text);
    if (result.error) {
      cb?.({ success: false, error: result.error });
      return;
    }
    cb?.({ success: true, channel: result.channel });
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

setInterval(() => cleanupRooms(), 1000 * 60 * 30);

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
