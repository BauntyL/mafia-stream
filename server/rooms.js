import {
  PHASES,
  NIGHT_SUBPHASES,
  generateRoomCode,
  generatePlayerId,
  getRoleDistribution,
  shuffle,
  isMafiaTeam,
  checkWin,
  MIN_PLAYERS,
  MAX_PLAYERS,
} from './constants.js';

const rooms = new Map();
const CHAT_LIMIT = 150;
const LOG_LIMIT = 80;
const SKIP = '__skip__';

let counter = 0;
function nextId() {
  counter += 1;
  return `${Date.now().toString(36)}${counter.toString(36)}`;
}

const DEFAULT_SETTINGS = {
  includeDoctor: true,
  discussionTime: 180,
  speechTime: 60,
  showHostInOverlay: false,
  revealRoleOnDeath: true,
  autoAdvanceNight: false,
  chatEnabled: true,
};

const BOT_NAMES = [
  'Лука',
  'Марта',
  'Осип',
  'Роза',
  'Тихон',
  'Клава',
  'Савва',
  'Ада',
  'Мирон',
  'Зоя',
  'Прохор',
  'Нина',
];

function createPlayer(nickname, socketId, isCreator = false) {
  return {
    id: generatePlayerId(),
    nickname,
    socketId,
    isCreator,
    isBot: false,
    lastChatDay: null,
    isHost: false,
    slot: 0,
    cameraStreamId: null,
    cameraViewUrl: null,
    role: null,
    alive: true,
    deathReason: null,
    deathPhase: null,
    deathDay: null,
    connected: true,
    ready: false,
    roleSeen: false,
    selfHealUsed: false,
  };
}

function assignSlots(players) {
  players
    .filter((p) => !p.isHost)
    .forEach((p, i) => {
      p.slot = i + 1;
    });
  players.filter((p) => p.isHost).forEach((p) => {
    p.slot = 0;
  });
}

/* ── Журнал и чат ────────────────────────────────────────────── */

export function pushLog(room, text, tone = 'neutral') {
  room.log.push({ id: nextId(), at: Date.now(), text, tone, day: room.dayNumber });
  if (room.log.length > LOG_LIMIT) room.log.splice(0, room.log.length - LOG_LIMIT);
}

function pushChat(room, message) {
  room.chat.push({ id: nextId(), at: Date.now(), ...message });
  if (room.chat.length > CHAT_LIMIT) room.chat.splice(0, room.chat.length - CHAT_LIMIT);
}

function systemChat(room, text, channel = 'system') {
  pushChat(room, { channel, text, system: true, authorId: null, authorName: null, authorSlot: null });
}

/* ── Создание и вход ─────────────────────────────────────────── */

export function createRoom(nickname, socketId) {
  const code = generateRoomCode();
  const player = createPlayer(nickname, socketId, true);
  player.isHost = true;
  const room = {
    code,
    createdAt: Date.now(),
    creatorId: player.id,
    hostId: player.id,
    phase: PHASES.LOBBY,
    nightSubPhase: null,
    dayNumber: 0,
    players: [player],
    hostVotes: {},
    settings: { ...DEFAULT_SETTINGS },
    nightActions: {},
    actedThisStep: {},
    votes: {},
    voteCandidates: null,
    revoteRound: 0,
    lastNightResult: null,
    lastVoteResult: null,
    lastDoctorTarget: null,
    winner: null,
    chat: [],
    log: [],
    checks: {},
    timer: null,
    speaking: null,
    gameNumber: 0,
  };
  assignSlots(room.players);
  rooms.set(code, room);
  return { room, player };
}

export function joinRoom(code, nickname, socketId) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) return { error: 'Лобби не найдено' };

  const trimmed = String(nickname || '').trim();
  if (!trimmed) return { error: 'Введите никнейм' };

  const sameName = room.players.find(
    (p) => p.nickname.toLowerCase() === trimmed.toLowerCase(),
  );

  // Вернуться в начатую партию можно только под своим ником
  if (room.phase !== PHASES.LOBBY) {
    if (sameName) {
      sameName.socketId = socketId;
      sameName.connected = true;
      pushLog(room, `${sameName.nickname} вернулся в игру`);
      return { room, player: sameName };
    }
    return { error: 'Игра уже началась' };
  }

  if (sameName) return { error: 'Такой ник уже занят' };
  if (room.players.length >= MAX_PLAYERS + 1) return { error: 'Лобби заполнено' };

  const player = createPlayer(trimmed, socketId);
  room.players.push(player);
  assignSlots(room.players);
  return { room, player };
}

export function reconnectPlayer(code, playerId, socketId) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) return { error: 'Лобби не найдено' };
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { error: 'Игрок не найден' };
  player.socketId = socketId;
  player.connected = true;
  return { room, player };
}

export function getRoom(code) {
  return rooms.get(String(code || '').toUpperCase());
}

/* ── Боты для теста ──────────────────────────────────────────── */

export function addBot(room) {
  if (room.phase !== PHASES.LOBBY) return { error: 'Ботов можно добавить только в лобби' };
  const atTable = room.players.filter((p) => !p.isHost).length;
  if (atTable >= MAX_PLAYERS) return { error: `За столом уже ${MAX_PLAYERS} игроков` };

  const taken = new Set(room.players.map((p) => p.nickname.toLowerCase()));
  const name =
    BOT_NAMES.find((n) => !taken.has(n.toLowerCase())) || `Бот ${atTable + 1}`;

  const bot = createPlayer(name, null);
  bot.isBot = true;
  bot.ready = true;
  room.players.push(bot);
  assignSlots(room.players);
  return { success: true, bot };
}

export function removeBots(room) {
  if (room.phase !== PHASES.LOBBY) return { error: 'Убрать ботов можно только в лобби' };
  room.players = room.players.filter((p) => !p.isBot);
  assignSlots(room.players);
  return { success: true };
}

export function setHost(room, playerId) {
  if (room.phase !== PHASES.LOBBY) return false;
  const target = room.players.find((p) => p.id === playerId);
  if (!target || target.isBot) return false;
  room.players.forEach((p) => {
    p.isHost = p.id === playerId;
  });
  room.hostId = playerId;
  assignSlots(room.players);
  return true;
}

export function voteForHost(room, voterId, targetId) {
  room.hostVotes[voterId] = targetId;
  const counts = {};
  Object.values(room.hostVotes).forEach((id) => {
    counts[id] = (counts[id] || 0) + 1;
  });
  const majority = Math.ceil(room.players.length / 2);
  for (const [id, count] of Object.entries(counts)) {
    if (count >= majority) {
      setHost(room, id);
      return true;
    }
  }
  return false;
}

export function setCamera(room, playerId, streamId, viewUrl) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return false;
  player.cameraStreamId = streamId || null;
  player.cameraViewUrl = viewUrl || null;
  return true;
}

export function setReady(room, playerId, ready) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return false;
  player.ready = !!ready;
  return true;
}

export function kickPlayer(room, playerId) {
  if (room.phase !== PHASES.LOBBY) return null;
  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.isHost) return null;
  room.players = room.players.filter((p) => p.id !== playerId);
  assignSlots(room.players);
  return player;
}

/* ── Таймер ──────────────────────────────────────────────────── */

export function startTimer(room, seconds, label) {
  const secs = Math.max(5, Math.min(900, Number(seconds) || 60));
  room.timer = { endsAt: Date.now() + secs * 1000, total: secs, label: label || 'Время' };
}

export function stopTimer(room) {
  room.timer = null;
}

/* ── Старт партии ────────────────────────────────────────────── */

export function startGame(room) {
  const gamePlayers = room.players.filter((p) => !p.isHost);
  if (gamePlayers.length < MIN_PLAYERS) {
    return { error: `Нужно минимум ${MIN_PLAYERS} игроков, не считая ведущего` };
  }
  if (gamePlayers.length > MAX_PLAYERS) {
    return { error: `Максимум ${MAX_PLAYERS} игроков за столом` };
  }

  const roles = shuffle(getRoleDistribution(gamePlayers.length, room.settings.includeDoctor));
  gamePlayers.forEach((p, i) => {
    p.role = roles[i];
    p.alive = true;
    p.deathReason = null;
    p.deathPhase = null;
    p.deathDay = null;
    p.roleSeen = false;
    p.selfHealUsed = false;
    p.lastChatDay = null;
  });

  room.phase = PHASES.ROLE_REVEAL;
  room.dayNumber = 0;
  room.nightSubPhase = null;
  room.nightActions = {};
  room.actedThisStep = {};
  room.votes = {};
  room.voteCandidates = null;
  room.revoteRound = 0;
  room.lastNightResult = null;
  room.lastVoteResult = null;
  room.lastDoctorTarget = null;
  room.winner = null;
  room.chat = [];
  room.log = [];
  room.checks = {};
  room.timer = null;
  room.speaking = null;
  room.gameNumber += 1;

  const mafiaCount = gamePlayers.filter((p) => isMafiaTeam(p.role)).length;
  pushLog(room, `Партия началась: ${gamePlayers.length} игроков, ${mafiaCount} в мафии`, 'brass');
  systemChat(room, 'Партия началась. Изучите свою роль.');
  return { success: true };
}

export function restartGame(room) {
  room.phase = PHASES.LOBBY;
  room.nightSubPhase = null;
  room.dayNumber = 0;
  room.players.forEach((p) => {
    p.role = null;
    p.alive = true;
    p.deathReason = null;
    p.deathPhase = null;
    p.deathDay = null;
    p.roleSeen = false;
    p.selfHealUsed = false;
    p.ready = p.isBot;
    p.lastChatDay = null;
  });
  room.nightActions = {};
  room.actedThisStep = {};
  room.votes = {};
  room.voteCandidates = null;
  room.revoteRound = 0;
  room.lastNightResult = null;
  room.lastVoteResult = null;
  room.lastDoctorTarget = null;
  room.winner = null;
  room.chat = [];
  room.log = [];
  room.checks = {};
  room.timer = null;
  room.speaking = null;
  // Отключившихся в прошлой партии убираем из лобби
  room.players = room.players.filter((p) => p.connected || p.isHost);
  assignSlots(room.players);
}

export function markRoleSeen(room, playerId) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return false;
  player.roleSeen = true;
  return true;
}

/* ── Ночь ────────────────────────────────────────────────────── */

const NIGHT_ORDER = [
  NIGHT_SUBPHASES.MAFIA,
  NIGHT_SUBPHASES.DON,
  NIGHT_SUBPHASES.SHERIFF,
  NIGHT_SUBPHASES.DOCTOR,
  NIGHT_SUBPHASES.RESOLVE,
];

function hasAliveRole(room, role) {
  return room.players.some((p) => p.alive && !p.isHost && p.role === role);
}

function shouldSkipStep(room, step) {
  if (step === NIGHT_SUBPHASES.MAFIA) {
    return !room.players.some((p) => p.alive && !p.isHost && isMafiaTeam(p.role));
  }
  if (step === NIGHT_SUBPHASES.DON) return !hasAliveRole(room, 'don');
  if (step === NIGHT_SUBPHASES.SHERIFF) return !hasAliveRole(room, 'sheriff');
  if (step === NIGHT_SUBPHASES.DOCTOR) {
    return !room.settings.includeDoctor || !hasAliveRole(room, 'doctor');
  }
  return false;
}

export function startNight(room) {
  room.phase = PHASES.NIGHT;
  room.dayNumber += 1;
  room.nightActions = {};
  room.actedThisStep = {};
  room.lastNightResult = null;
  room.votes = {};
  room.voteCandidates = null;
  room.revoteRound = 0;
  room.timer = null;
  room.speaking = null;

  let step = NIGHT_ORDER[0];
  let i = 0;
  while (i < NIGHT_ORDER.length - 1 && shouldSkipStep(room, NIGHT_ORDER[i])) {
    i += 1;
    step = NIGHT_ORDER[i];
  }
  room.nightSubPhase = step;
  pushLog(room, `Ночь ${room.dayNumber}. Город засыпает`, 'night');
}

export function getStepActors(room) {
  if (room.phase !== PHASES.NIGHT) return [];
  const alive = room.players.filter((p) => !p.isHost && p.alive);
  switch (room.nightSubPhase) {
    case NIGHT_SUBPHASES.MAFIA:
      return alive.filter((p) => isMafiaTeam(p.role));
    case NIGHT_SUBPHASES.DON:
      return alive.filter((p) => p.role === 'don');
    case NIGHT_SUBPHASES.SHERIFF:
      return alive.filter((p) => p.role === 'sheriff');
    case NIGHT_SUBPHASES.DOCTOR:
      return alive.filter((p) => p.role === 'doctor');
    default:
      return [];
  }
}

export function canAct(room, player) {
  if (!player || !player.alive || player.isHost) return false;
  if (room.phase !== PHASES.NIGHT) return false;
  if (room.actedThisStep[player.id]) return false;
  return getStepActors(room).some((p) => p.id === player.id);
}

export function submitNightAction(room, playerId, targetId) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { error: 'Игрок не найден' };
  if (room.actedThisStep[playerId]) return { error: 'Вы уже сделали свой ход этой ночью' };
  if (!canAct(room, player)) return { error: 'Сейчас не ваш ход' };

  const sub = room.nightSubPhase;
  const skipping = !targetId || targetId === SKIP;

  if (skipping) {
    if (sub === NIGHT_SUBPHASES.SHERIFF || sub === NIGHT_SUBPHASES.DON) {
      return { error: 'Проверку нельзя пропустить' };
    }
    room.actedThisStep[playerId] = SKIP;
    if (sub === NIGHT_SUBPHASES.MAFIA) {
      room.nightActions.mafiaVotes = room.nightActions.mafiaVotes || {};
      room.nightActions.mafiaVotes[playerId] = SKIP;
    }
    return { success: true, skipped: true };
  }

  const target = room.players.find((p) => p.id === targetId);
  if (!target || target.isHost) return { error: 'Неверная цель' };
  if (!target.alive) return { error: 'Этот игрок уже выбыл' };

  if (sub === NIGHT_SUBPHASES.MAFIA) {
    if (isMafiaTeam(target.role)) return { error: 'Нельзя стрелять в своего' };
    room.nightActions.mafiaVotes = room.nightActions.mafiaVotes || {};
    room.nightActions.mafiaVotes[playerId] = targetId;
    room.actedThisStep[playerId] = targetId;
    return { success: true };
  }

  if (sub === NIGHT_SUBPHASES.DON) {
    if (targetId === playerId) return { error: 'Нельзя проверить себя' };
    room.nightActions.donCheck = targetId;
    room.actedThisStep[playerId] = targetId;
    const result = target.role === 'sheriff' ? 'sheriff' : 'not_sheriff';
    addCheck(room, playerId, target, result);
    return { success: true, checkResult: result };
  }

  if (sub === NIGHT_SUBPHASES.SHERIFF) {
    if (targetId === playerId) return { error: 'Нельзя проверить себя' };
    room.nightActions.sheriffCheck = targetId;
    room.actedThisStep[playerId] = targetId;
    const result = isMafiaTeam(target.role) ? 'mafia' : 'civilian';
    addCheck(room, playerId, target, result);
    return { success: true, checkResult: result };
  }

  if (sub === NIGHT_SUBPHASES.DOCTOR) {
    if (targetId === playerId) {
      if (player.selfHealUsed) return { error: 'Себя можно лечить только один раз за игру' };
      player.selfHealUsed = true;
    }
    if (room.lastDoctorTarget && room.lastDoctorTarget === targetId) {
      return { error: 'Нельзя лечить одного и того же две ночи подряд' };
    }
    room.nightActions.doctor = targetId;
    room.actedThisStep[playerId] = targetId;
    return { success: true };
  }

  return { error: 'Сейчас ходов нет' };
}

function addCheck(room, playerId, target, result) {
  room.checks[playerId] = room.checks[playerId] || [];
  room.checks[playerId].push({
    night: room.dayNumber,
    targetId: target.id,
    targetName: target.nickname,
    targetSlot: target.slot,
    result,
  });
}

export function advanceNightPhase(room) {
  if (room.phase !== PHASES.NIGHT) return;
  let idx = NIGHT_ORDER.indexOf(room.nightSubPhase);
  if (idx === -1) idx = 0;

  do {
    idx += 1;
  } while (idx < NIGHT_ORDER.length - 1 && shouldSkipStep(room, NIGHT_ORDER[idx]));

  room.nightSubPhase = NIGHT_ORDER[Math.min(idx, NIGHT_ORDER.length - 1)];
  room.actedThisStep = {};
}

export function isStepComplete(room) {
  if (room.phase === PHASES.ROLE_REVEAL) {
    const gp = room.players.filter((p) => !p.isHost);
    return gp.every((p) => p.roleSeen);
  }
  if (room.phase === PHASES.NIGHT) {
    if (room.nightSubPhase === NIGHT_SUBPHASES.RESOLVE) return true;
    const actors = getStepActors(room);
    return actors.every((p) => room.actedThisStep[p.id]);
  }
  if (room.phase === PHASES.VOTING) {
    return getVoters(room).every((p) => room.votes[p.id]);
  }
  return true;
}

function getStepStatus(room) {
  let total = 0;
  let done = 0;
  let waiting = [];

  if (room.phase === PHASES.ROLE_REVEAL) {
    const gp = room.players.filter((p) => !p.isHost);
    total = gp.length;
    done = gp.filter((p) => p.roleSeen).length;
    waiting = gp.filter((p) => !p.roleSeen).map((p) => p.nickname);
  } else if (room.phase === PHASES.NIGHT && room.nightSubPhase !== NIGHT_SUBPHASES.RESOLVE) {
    const actors = getStepActors(room);
    total = actors.length;
    done = actors.filter((p) => room.actedThisStep[p.id]).length;
    waiting = actors.filter((p) => !room.actedThisStep[p.id]).map((p) => p.nickname);
  } else if (room.phase === PHASES.VOTING) {
    const voters = getVoters(room);
    total = voters.length;
    done = voters.filter((p) => room.votes[p.id]).length;
    waiting = voters.filter((p) => !room.votes[p.id]).map((p) => p.nickname);
  }

  return { total, done, waiting, ready: isStepComplete(room) };
}

export function resolveNight(room) {
  const votes = room.nightActions.mafiaVotes || {};
  const counts = {};
  Object.values(votes).forEach((id) => {
    if (id && id !== SKIP) counts[id] = (counts[id] || 0) + 1;
  });

  let mafiaTarget = null;
  let best = 0;
  let tied = [];
  for (const [id, count] of Object.entries(counts)) {
    if (count > best) {
      best = count;
      mafiaTarget = id;
      tied = [id];
    } else if (count === best) {
      tied.push(id);
    }
  }
  // При разногласии решает дон
  if (tied.length > 1) {
    const don = room.players.find((p) => p.alive && p.role === 'don');
    const donChoice = don ? votes[don.id] : null;
    mafiaTarget = donChoice && donChoice !== SKIP ? donChoice : null;
  }

  const doctorTarget = room.nightActions.doctor || null;
  room.lastDoctorTarget = doctorTarget;

  let killed = null;
  let saved = false;

  if (mafiaTarget) {
    if (mafiaTarget === doctorTarget) {
      saved = true;
    } else {
      const victim = room.players.find((p) => p.id === mafiaTarget);
      if (victim && victim.alive) {
        victim.alive = false;
        victim.deathReason = 'killed';
        victim.deathPhase = 'night';
        victim.deathDay = room.dayNumber;
        killed = victim;
      }
    }
  }

  room.lastNightResult = {
    peaceful: !killed,
    saved,
    killedId: killed?.id || null,
    killedName: killed?.nickname || null,
    killedSlot: killed?.slot || null,
    killedRole: room.settings.revealRoleOnDeath ? killed?.role || null : null,
  };

  if (killed) {
    pushLog(room, `Ночью убит ${killed.nickname} (№${killed.slot})`, 'blood');
    systemChat(room, `Ночью убит ${killed.nickname}. Город просыпается.`);
  } else if (saved) {
    pushLog(room, 'Доктор успел вовремя — все живы', 'sage');
    systemChat(room, 'Ночь прошла спокойно. Все живы.');
  } else {
    pushLog(room, 'Ночь прошла спокойно', 'sage');
    systemChat(room, 'Ночь прошла спокойно. Все живы.');
  }

  room.actedThisStep = {};
  room.nightActions = {};

  const winner = checkWin(room.players.filter((p) => !p.isHost));
  if (winner) {
    finishGame(room, winner);
    return { killed, winner };
  }

  room.phase = PHASES.DAY;
  room.nightSubPhase = null;
  room.speaking = null;
  pushLog(room, `День ${room.dayNumber}. Обсуждение`, 'brass');
  if (room.settings.discussionTime > 0) {
    startTimer(room, room.settings.discussionTime, 'Обсуждение');
  }
  return { killed, winner: null };
}

/* ── День: очередь речей ─────────────────────────────────────── */

export function nextSpeaker(room) {
  const alive = room.players
    .filter((p) => !p.isHost && p.alive)
    .sort((a, b) => a.slot - b.slot);
  if (alive.length === 0) return null;

  const currentIdx = room.speaking
    ? alive.findIndex((p) => p.id === room.speaking.playerId)
    : -1;

  const nextIdx = currentIdx + 1;
  if (nextIdx >= alive.length) {
    room.speaking = null;
    stopTimer(room);
    return null;
  }

  const speaker = alive[nextIdx];
  room.speaking = { playerId: speaker.id, nickname: speaker.nickname, slot: speaker.slot };
  if (room.settings.speechTime > 0) {
    startTimer(room, room.settings.speechTime, `Говорит ${speaker.nickname}`);
  }
  return speaker;
}

export function clearSpeaker(room) {
  room.speaking = null;
  stopTimer(room);
}

/* ── Голосование ─────────────────────────────────────────────── */

export function getVoters(room) {
  return room.players.filter((p) => !p.isHost && p.alive);
}

export function getVoteCandidates(room) {
  const alive = room.players.filter((p) => !p.isHost && p.alive);
  if (!room.voteCandidates) return alive;
  return alive.filter((p) => room.voteCandidates.includes(p.id));
}

export function startVoting(room) {
  room.phase = PHASES.VOTING;
  room.votes = {};
  room.voteCandidates = null;
  room.revoteRound = 0;
  room.speaking = null;
  stopTimer(room);
  pushLog(room, 'Началось голосование', 'blood');
  systemChat(room, 'Голосование началось.');
}

export function submitVote(room, voterId, targetId) {
  if (room.phase !== PHASES.VOTING) return { error: 'Сейчас не голосование' };
  const voter = room.players.find((p) => p.id === voterId);
  if (!voter || voter.isHost) return { error: 'Ведущий не голосует' };
  if (!voter.alive) return { error: 'Выбывшие не голосуют' };
  if (room.votes[voterId]) return { error: 'Вы уже проголосовали' };

  if (!targetId || targetId === SKIP) {
    room.votes[voterId] = SKIP;
    return { success: true, skipped: true };
  }

  const candidates = getVoteCandidates(room);
  const target = candidates.find((p) => p.id === targetId);
  if (!target) return { error: 'Этого игрока нельзя выбрать' };
  if (targetId === voterId) return { error: 'Нельзя голосовать за себя' };

  room.votes[voterId] = targetId;
  return { success: true };
}

export function resolveVoting(room) {
  const voteCounts = {};
  Object.values(room.votes).forEach((id) => {
    if (id && id !== SKIP) voteCounts[id] = (voteCounts[id] || 0) + 1;
  });

  let maxVotes = 0;
  let leaders = [];
  for (const [id, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      leaders = [id];
    } else if (count === maxVotes) {
      leaders.push(id);
    }
  }

  const voteBreakdown = Object.entries(room.votes).map(([voterId, targetId]) => ({
    voterId,
    voterName: room.players.find((p) => p.id === voterId)?.nickname || '',
    targetId: targetId === SKIP ? null : targetId,
    targetName:
      targetId === SKIP
        ? null
        : room.players.find((p) => p.id === targetId)?.nickname || '',
  }));

  // Ничья — одна переголосовка между лидерами, потом никто не уходит
  if (leaders.length > 1 && maxVotes > 0 && room.revoteRound === 0) {
    room.revoteRound = 1;
    room.voteCandidates = leaders;
    room.votes = {};
    room.lastVoteResult = {
      exiledId: null,
      exiledName: null,
      exiledRole: null,
      tie: true,
      revote: true,
      voteCounts,
      breakdown: voteBreakdown,
    };
    const names = leaders
      .map((id) => room.players.find((p) => p.id === id)?.nickname)
      .filter(Boolean)
      .join(', ');
    pushLog(room, `Ничья: ${names}. Переголосовка`, 'brass');
    systemChat(room, `Ничья между: ${names}. Переголосовка.`);
    return { exiled: null, tie: true, revote: true, winner: null };
  }

  let exiled = null;
  const tie = leaders.length > 1 && maxVotes > 0;
  if (!tie && leaders.length === 1 && maxVotes > 0) {
    exiled = room.players.find((p) => p.id === leaders[0]) || null;
    if (exiled) {
      exiled.alive = false;
      exiled.deathReason = 'voted';
      exiled.deathPhase = 'day';
      exiled.deathDay = room.dayNumber;
    }
  }

  room.lastVoteResult = {
    exiledId: exiled?.id || null,
    exiledName: exiled?.nickname || null,
    exiledRole: room.settings.revealRoleOnDeath ? exiled?.role || null : null,
    tie,
    revote: false,
    voteCounts,
    breakdown: voteBreakdown,
  };

  if (exiled) {
    pushLog(room, `Город изгнал ${exiled.nickname} (№${exiled.slot})`, 'blood');
    systemChat(room, `Город изгнал ${exiled.nickname}.`);
  } else {
    pushLog(room, 'Голосование ничем не закончилось — никто не изгнан', 'neutral');
    systemChat(room, 'Никто не изгнан.');
  }

  const winner = checkWin(room.players.filter((p) => !p.isHost));
  if (winner) {
    finishGame(room, winner);
    return { exiled, winner };
  }

  startNight(room);
  return { exiled, winner: null };
}

export function checkWinNow(room) {
  if (room.phase === PHASES.LOBBY || room.phase === PHASES.ENDED) return null;
  const winner = checkWin(room.players.filter((p) => !p.isHost));
  if (winner) finishGame(room, winner);
  return winner;
}

function finishGame(room, winner) {
  room.phase = PHASES.ENDED;
  room.nightSubPhase = null;
  room.winner = winner;
  room.timer = null;
  room.speaking = null;
  pushLog(room, winner === 'city' ? 'Победа города' : 'Победа мафии', 'brass');
  systemChat(room, winner === 'city' ? 'Город победил.' : 'Мафия победила.');
}

/* ── Чат ─────────────────────────────────────────────────────── */

export function addChatMessage(room, playerId, rawText) {
  if (!room.settings.chatEnabled) return { error: 'Чат выключен ведущим' };
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { error: 'Игрок не найден' };

  const text = String(rawText || '').trim().slice(0, 300);
  if (!text) return { error: 'Пустое сообщение' };

  let channel;
  if (player.isHost) {
    channel = 'all';
  } else if (!player.alive) {
    channel = 'dead';
  } else if (room.phase === PHASES.NIGHT) {
    if (isMafiaTeam(player.role) && room.nightSubPhase === NIGHT_SUBPHASES.MAFIA) {
      channel = 'mafia';
    } else if (isMafiaTeam(player.role)) {
      channel = 'mafia';
    } else {
      return { error: 'Ночью город спит' };
    }
  } else if (room.phase === PHASES.LOBBY || room.phase === PHASES.ENDED) {
    channel = 'all';
  } else if (room.phase === PHASES.ROLE_REVEAL) {
    return { error: 'Дождитесь начала игры' };
  } else {
    channel = 'all';
  }

  pushChat(room, {
    channel,
    text,
    system: false,
    authorId: player.id,
    authorName: player.nickname,
    authorSlot: player.slot,
    isHost: player.isHost,
  });
  return { success: true, channel };
}

function visibleChat(room, viewer, isOverlay) {
  return room.chat.filter((m) => {
    if (m.channel === 'system' || m.channel === 'all') return true;
    if (isOverlay || !viewer) return false;
    if (viewer.isHost) return true;
    if (m.channel === 'mafia') return viewer.alive && isMafiaTeam(viewer.role);
    if (m.channel === 'dead') return !viewer.alive;
    return false;
  });
}

/* ── Сериализация ────────────────────────────────────────────── */

export function serializeRoom(room, viewerId = null, isOverlay = false) {
  const viewer = room.players.find((p) => p.id === viewerId) || null;
  const isHost = viewer?.isHost || false;
  const revealAll = room.phase === PHASES.ENDED;
  const revealDead = room.settings.revealRoleOnDeath;

  const players = room.players.map((p) => {
    const base = {
      id: p.id,
      nickname: p.nickname,
      slot: p.slot,
      isHost: p.isHost,
      isCreator: p.isCreator,
      isBot: p.isBot,
      alive: p.alive,
      deathReason: p.deathReason,
      deathPhase: p.deathPhase,
      deathDay: p.deathDay,
      connected: p.connected,
      ready: p.ready,
      roleSeen: p.roleSeen,
      hasCamera: !!p.cameraViewUrl,
      cameraStreamId: p.cameraStreamId,
      cameraViewUrl: isOverlay || p.id === viewerId ? p.cameraViewUrl : null,
    };

    const seesRole =
      isHost ||
      revealAll ||
      (!p.alive && revealDead && p.role) ||
      (viewer && p.id === viewerId) ||
      (viewer && viewer.alive && isMafiaTeam(viewer.role) && isMafiaTeam(p.role));

    if (seesRole && p.role) base.role = p.role;
    if (viewer && !viewer.isHost && viewer.alive && isMafiaTeam(viewer.role) && isMafiaTeam(p.role) && p.id !== viewerId) {
      base.isTeammate = true;
    }
    return base;
  });

  const gamePlayers = room.players.filter((p) => !p.isHost);
  const alive = gamePlayers.filter((p) => p.alive);

  const state = {
    code: room.code,
    phase: room.phase,
    nightSubPhase: room.nightSubPhase,
    dayNumber: room.dayNumber,
    hostId: room.hostId,
    players,
    settings: room.settings,
    lastNightResult: room.lastNightResult,
    lastVoteResult: room.lastVoteResult,
    winner: room.winner,
    hostVotes: room.hostVotes,
    playerCount: room.players.length,
    gamePlayerCount: gamePlayers.length,
    aliveCount: alive.length,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    canStart: gamePlayers.length >= MIN_PLAYERS && gamePlayers.length <= MAX_PLAYERS,
    timer: room.timer,
    speaking: room.speaking,
    log: room.log,
    chat: visibleChat(room, viewer, isOverlay),
    voteCandidateIds: room.voteCandidates,
    revoteRound: room.revoteRound,
    gameNumber: room.gameNumber,
    stepReady: isStepComplete(room),
  };

  // Живой подсчёт голосов виден всем — это часть шоу
  if (room.phase === PHASES.VOTING) {
    const tally = {};
    let abstained = 0;
    Object.values(room.votes).forEach((id) => {
      if (id === SKIP) abstained += 1;
      else tally[id] = (tally[id] || 0) + 1;
    });
    state.voteTally = tally;
    state.voteAbstained = abstained;
    state.votedCount = Object.keys(room.votes).length;
    state.voterCount = getVoters(room).length;
    state.publicVotes = Object.fromEntries(
      Object.entries(room.votes).map(([k, v]) => [k, v === SKIP ? null : v]),
    );
  }

  if (isHost) {
    state.step = getStepStatus(room);
    state.mafiaVotes = room.nightActions.mafiaVotes || {};
    state.nightPicks = {
      mafia: room.nightActions.mafiaVotes || {},
      don: room.nightActions.donCheck || null,
      sheriff: room.nightActions.sheriffCheck || null,
      doctor: room.nightActions.doctor || null,
    };
  }

  if (viewer && !viewer.isHost) {
    const acted = room.actedThisStep[viewer.id];
    state.you = {
      id: viewer.id,
      alive: viewer.alive,
      canAct: canAct(room, viewer),
      actionLocked: !!acted,
      actionTargetId: acted && acted !== SKIP ? acted : null,
      actionSkipped: acted === SKIP,
      voteLocked: !!room.votes[viewer.id],
      voteTargetId:
        room.votes[viewer.id] && room.votes[viewer.id] !== SKIP ? room.votes[viewer.id] : null,
      voteSkipped: room.votes[viewer.id] === SKIP,
      checks: room.checks[viewer.id] || [],
      selfHealUsed: viewer.selfHealUsed,
      canSelfHeal: !viewer.selfHealUsed,
      blockedHealId: room.lastDoctorTarget,
    };
    if (viewer.alive && isMafiaTeam(viewer.role) && room.phase === PHASES.NIGHT) {
      state.mafiaVotes = Object.fromEntries(
        Object.entries(room.nightActions.mafiaVotes || {}).map(([k, v]) => [
          k,
          v === SKIP ? null : v,
        ]),
      );
    }
  }

  return state;
}

export function removePlayer(socketId) {
  for (const [code, room] of rooms.entries()) {
    const player = room.players.find((p) => p.socketId === socketId);
    if (!player) continue;

    player.connected = false;
    player.socketId = null;

    if (room.phase === PHASES.LOBBY) {
      room.players = room.players.filter((p) => p.id !== player.id);
      assignSlots(room.players);
      if (room.players.length === 0) {
        rooms.delete(code);
        return null;
      }
      if (room.hostId === player.id) {
        room.players[0].isHost = true;
        room.hostId = room.players[0].id;
        assignSlots(room.players);
      }
    } else {
      pushLog(room, `${player.nickname} потерял связь`, 'neutral');
    }
    return room;
  }
  return null;
}

export function cleanupRooms(maxAgeMs = 1000 * 60 * 60 * 8) {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    const anyone = room.players.some((p) => p.connected);
    if (!anyone && now - room.createdAt > maxAgeMs) rooms.delete(code);
  }
}

export { SKIP };
