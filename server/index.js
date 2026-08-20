import './load-env.js';
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
  abortGame,
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
  startNominations,
  closeNominations,
  submitNomination,
  applySettings,
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
import { isNarratorBusy, narratorLeftMs, skipNarrator } from './narrator.js';
import {
  fishConfigured,
  getNarratorClip,
  listFishVoices,
  prepareVoiceClips,
  sanitizeVoiceId,
} from './fish-tts.js';
import {
  LOBBY_HALL,
  setVisitor,
  removeVisitor,
  addLobbyChat,
  lobbySnapshot,
} from './lobby.js';

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

function narratorWait(room, cb) {
  if (!isNarratorBusy(room)) return false;
  cb?.({ success: false, error: 'Дождитесь, пока диктор закончит' });
  return true;
}

function emitLobby() {
  io.to(LOBBY_HALL).emit('lobbyState', lobbySnapshot());
}

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

async function prepareRoomVoice(room) {
  const voiceId = room.settings.narratorVoiceId;
  if (!voiceId) {
    room.narratorVoicePreparing = false;
    room.narratorVoiceError = '';
    room.narratorClipMs = {};
    return;
  }
  room.narratorVoicePreparing = true;
  room.narratorVoiceError = '';
  emitRoomUpdate(room);
  try {
    const { durations } = await prepareVoiceClips(voiceId);
    if (room.settings.narratorVoiceId !== voiceId) return;
    room.narratorClipMs = durations;
    room.narratorVoicePreparing = false;
    room.narratorVoiceError = '';
  } catch (err) {
    if (room.settings.narratorVoiceId !== voiceId) return;
    room.narratorVoicePreparing = false;
    room.narratorVoiceError = err.message || 'Не удалось подготовить голос';
  }
}

const botTimers = new Map();

/** Боты ходят по одному с задержкой; цикл сам останавливается, когда ходить некому. */
function scheduleBots(room) {
  if (botTimers.has(room.code)) return;
  if (!room.players.some((p) => p.isBot)) return;

  const narratorWaitMs = narratorLeftMs(room);
  const delay =
    narratorWaitMs > 0 ? narratorWaitMs + 300 : 700 + Math.floor(Math.random() * 700);

  const timer = setTimeout(() => {
    botTimers.delete(room.code);
    const fresh = getRoom(room.code);
    if (!fresh) return;
    if (isNarratorBusy(fresh)) {
      scheduleBots(fresh);
      return;
    }
    if (runBots(fresh)) emitRoomUpdate(fresh);
  }, delay);

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
    socket.leave(LOBBY_HALL);
    setVisitor(socket.id, name, 'table');
    cb?.({ success: true, room: serializeRoom(room, player.id), playerId: player.id });
    emitRoomUpdate(room);
    emitLobby();
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
    socket.leave(LOBBY_HALL);
    setVisitor(socket.id, player.nickname, 'table');
    cb?.({ success: true, room: serializeRoom(room, player.id), playerId: player.id });
    emitRoomUpdate(room);
    emitLobby();
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
    socket.leave(LOBBY_HALL);
    setVisitor(socket.id, player.nickname, 'table');
    cb?.({ success: true, room: serializeRoom(room, player.id), playerId: player.id });
    emitRoomUpdate(room);
    emitLobby();
  });

  socket.on('joinOverlay', ({ code }) => {
    const key = String(code || '').toUpperCase();
    socket.join(`${key}_overlay`);
    socket.data.overlayCode = key;
    const room = getRoom(key);
    if (room) socket.emit('roomUpdateOverlay', serializeRoom(room, null, true));
  });

  socket.on('hello', ({ nickname, where }, cb) => {
    const result = setVisitor(socket.id, nickname, where);
    if (result.error) {
      cb?.({ success: false, error: result.error });
      return;
    }
    if (where === 'table') socket.leave(LOBBY_HALL);
    else socket.join(LOBBY_HALL);
    cb?.({ success: true, lobby: lobbySnapshot() });
    emitLobby();
  });

  socket.on('lobbyChat', ({ text }, cb) => {
    const result = addLobbyChat(socket.id, text);
    if (result.error) {
      cb?.({ success: false, error: result.error });
      return;
    }
    emitLobby();
    cb?.({ success: true });
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

  socket.on('setCamera', ({ enabled }, cb) => {
    const { room } = ctx();
    if (!room) return done(cb);
    setCamera(room, currentPlayerId, enabled);
    done(cb, room);
  });

  /* ── WebRTC: камеры игроков → экран OBS ────────────────── */

  const roomOf = () => getRoom(currentRoom) || getRoom(socket.data.overlayCode);

  socket.on('webrtcWatch', ({ playerId }) => {
    const room = roomOf();
    if (!room || !playerId) return;
    const target = room.players.find((p) => p.id === playerId);
    if (!target?.socketId || !target.hasCamera) return;
    io.to(target.socketId).emit('webrtcWatch', { viewerId: socket.id });
  });

  socket.on('webrtcOffer', ({ viewerId, sdp }) => {
    if (!viewerId || !sdp || !currentPlayerId) return;
    io.to(viewerId).emit('webrtcOffer', { playerId: currentPlayerId, sdp });
  });

  socket.on('webrtcAnswer', ({ playerId, sdp }) => {
    const room = roomOf();
    if (!room || !playerId || !sdp) return;
    const target = room.players.find((p) => p.id === playerId);
    if (!target?.socketId) return;
    io.to(target.socketId).emit('webrtcAnswer', { viewerId: socket.id, sdp });
  });

  socket.on('webrtcIce', ({ viewerId, playerId, candidate }) => {
    if (!candidate) return;
    if (viewerId) {
      io.to(viewerId).emit('webrtcIce', { playerId: currentPlayerId, candidate });
      return;
    }
    const room = roomOf();
    if (!room || !playerId) return;
    const target = room.players.find((p) => p.id === playerId);
    if (!target?.socketId) return;
    io.to(target.socketId).emit('webrtcIce', { viewerId: socket.id, candidate });
  });

  socket.on('updateSettings', ({ settings }, cb) => {
    const { room } = hostCtx();
    if (!room) return done(cb);
    const prevVoice = room.settings.narratorVoiceId;
    applySettings(room, settings);
    done(cb, room);
    if (room.settings.narratorVoiceId !== prevVoice) {
      prepareRoomVoice(room).then(() => emitRoomUpdate(room));
    }
  });

  socket.on('skipNarrator', (_, cb) => {
    const { room } = hostCtx();
    if (!room) return done(cb);
    skipNarrator(room);
    done(cb, room);
  });

  /* ── Ход партии ────────────────────────────────────────── */

  socket.on('startGame', (_, cb) => {
    const { room } = hostCtx();
    if (!room) {
      cb?.({ success: false, error: 'Только ведущий может начать игру' });
      return;
    }
    if (narratorWait(room, cb)) return;
    const result = startGame(room);
    if (result.error) {
      cb?.({ success: false, error: result.error });
      return;
    }
    cb?.({ success: true });
    emitRoomUpdate(room);
  });

  socket.on('abortGame', (_, cb) => {
    const { room } = hostCtx();
    if (!room) return done(cb);
    const result = abortGame(room);
    if (result.error) {
      cb?.({ success: false, error: result.error });
      return;
    }
    done(cb, room);
  });

  socket.on('restartGame', (_, cb) => {
    const { room } = hostCtx();
    if (!room) return done(cb);
    if (narratorWait(room, cb)) return;
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
    if (narratorWait(room, cb)) return;
    startNight(room);
    done(cb, room);
  });

  socket.on('hostAdvanceNight', (_, cb) => {
    const { room } = hostCtx();
    if (!room) return done(cb);
    if (narratorWait(room, cb)) return;
    advanceNightPhase(room);
    done(cb, room);
  });

  socket.on('hostResolveNight', (_, cb) => {
    const { room } = hostCtx();
    if (!room || room.phase !== 'night') return done(cb);
    if (narratorWait(room, cb)) return;
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
    if (!room) return done(cb);
    if (narratorWait(room, cb)) return;
    if (room.phase === 'nominating') {
      closeNominations(room);
      done(cb, room);
      return;
    }
    if (room.phase !== 'day') return done(cb);
    if (room.settings.requireNominations) startNominations(room);
    else startVoting(room);
    done(cb, room);
  });

  socket.on('hostResolveVoting', (_, cb) => {
    const { room } = hostCtx();
    if (!room || room.phase !== 'voting') return done(cb);
    if (narratorWait(room, cb)) return;
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
      const sub = room.nightSubPhase;
      const day = room.dayNumber;
      const wait = Math.max(1500, narratorLeftMs(room));
      setTimeout(() => {
        const fresh = getRoom(room.code);
        if (!fresh || fresh.phase !== 'night') return;
        if (fresh.nightSubPhase !== sub || fresh.dayNumber !== day) return;
        if (fresh.nightSubPhase === 'resolve') return;
        if (!isStepComplete(fresh)) return;
        if (isNarratorBusy(fresh)) return;
        advanceNightPhase(fresh);
        emitRoomUpdate(fresh);
      }, wait);
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

  socket.on('nominate', ({ targetId }, cb) => {
    const { room } = ctx();
    if (!room) {
      cb?.({ success: false, error: 'Комната не найдена' });
      return;
    }
    const result = submitNomination(room, currentPlayerId, targetId);
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
    const overlayCode = socket.data.overlayCode;
    if (overlayCode) {
      const overlayRoom = getRoom(overlayCode);
      overlayRoom?.players.forEach((p) => {
        if (p.socketId) io.to(p.socketId).emit('webrtcViewerLeft', { viewerId: socket.id });
      });
    }
    const room = removePlayer(socket.id);
    removeVisitor(socket.id);
    if (room) emitRoomUpdate(room);
    emitLobby();
  });
});

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/narrator/status', (_, res) => {
  res.json({ configured: fishConfigured() });
});

app.get('/api/narrator/voices', async (req, res) => {
  try {
    const data = await listFishVoices(String(req.query.q || ''));
    res.json(data);
  } catch (err) {
    res.status(502).json({ configured: fishConfigured(), items: [], error: err.message });
  }
});

app.get('/api/narrator/:voiceId/:blockId', async (req, res) => {
  const voiceId = sanitizeVoiceId(req.params.voiceId);
  const blockId = String(req.params.blockId || '').replace(/\.mp3$/i, '');
  if (!voiceId) {
    res.status(400).end();
    return;
  }
  try {
    const clip = await getNarratorClip(voiceId, blockId);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(clip.buf);
  } catch (err) {
    const code = /не задан/i.test(err.message) ? 503 : /неизвестный|нужен id/i.test(err.message) ? 404 : 502;
    res.status(code).json({ error: err.message });
  }
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
