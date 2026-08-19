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

function createPlayer(nickname, socketId, isCreator = false) {
  return {
    id: generatePlayerId(),
    nickname,
    socketId,
    isCreator,
    isHost: false,
    slot: 0,
    cameraStreamId: null,
    cameraViewUrl: null,
    role: null,
    alive: true,
    deathReason: null,
    deathPhase: null,
    connected: true,
  };
}

function assignSlots(players) {
  players.forEach((p, i) => {
    p.slot = i + 1;
  });
}

export function createRoom(nickname, socketId) {
  const code = generateRoomCode();
  const player = createPlayer(nickname, socketId, true);
  player.isHost = true;
  const room = {
    code,
    creatorId: player.id,
    hostId: player.id,
    phase: PHASES.LOBBY,
    nightSubPhase: null,
    dayNumber: 0,
    players: [player],
    hostVotes: {},
    settings: {
      includeDoctor: true,
      discussionTime: 120,
      showHostInOverlay: false,
    },
    nightActions: {},
    votes: {},
    lastNightResult: null,
    lastVoteResult: null,
    winner: null,
    roleRevealIndex: 0,
  };
  assignSlots(room.players);
  rooms.set(code, room);
  return { room, player };
}

export function joinRoom(code, nickname, socketId) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { error: 'Лобби не найдено' };
  if (room.phase !== PHASES.LOBBY) return { error: 'Игра уже началась' };
  if (room.players.length >= MAX_PLAYERS) return { error: 'Лобби заполнено' };
  const existing = room.players.find((p) => p.nickname.toLowerCase() === nickname.toLowerCase());
  if (existing) return { error: 'Такой ник уже занят' };

  const player = createPlayer(nickname, socketId);
  room.players.push(player);
  assignSlots(room.players);
  return { room, player };
}

export function reconnectPlayer(code, playerId, socketId) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { error: 'Лобби не найдено' };
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { error: 'Игрок не найден' };
  player.socketId = socketId;
  player.connected = true;
  return { room, player };
}

export function getRoom(code) {
  return rooms.get(code.toUpperCase());
}

export function setHost(room, playerId) {
  room.players.forEach((p) => {
    p.isHost = p.id === playerId;
  });
  room.hostId = playerId;
}

export function voteForHost(room, voterId, targetId) {
  room.hostVotes[voterId] = targetId;
  const votes = Object.values(room.hostVotes);
  const counts = {};
  votes.forEach((id) => {
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
  player.cameraStreamId = streamId;
  player.cameraViewUrl = viewUrl;
  return true;
}

export function startGame(room) {
  const gamePlayers = room.players.filter((p) => !p.isHost);
  if (gamePlayers.length < MIN_PLAYERS) {
    return { error: `Нужно минимум ${MIN_PLAYERS} игроков (без ведущего)` };
  }

  const roles = shuffle(getRoleDistribution(gamePlayers.length, room.settings.includeDoctor));
  gamePlayers.forEach((p, i) => {
    p.role = roles[i];
    p.alive = true;
    p.deathReason = null;
    p.deathPhase = null;
  });

  room.phase = PHASES.ROLE_REVEAL;
  room.dayNumber = 0;
  room.nightActions = {};
  room.votes = {};
  room.winner = null;
  room.roleRevealIndex = 0;
  return { success: true };
}

export function advanceRoleReveal(room) {
  room.roleRevealIndex++;
  const gamePlayers = room.players.filter((p) => !p.isHost);
  if (room.roleRevealIndex >= gamePlayers.length) {
    room.phase = PHASES.NIGHT;
    room.dayNumber = 1;
    room.nightSubPhase = NIGHT_SUBPHASES.MAFIA;
    room.nightActions = {};
  }
}

export function startNight(room) {
  room.phase = PHASES.NIGHT;
  room.dayNumber++;
  room.nightSubPhase = NIGHT_SUBPHASES.MAFIA;
  room.nightActions = {};
  room.lastNightResult = null;
}

export function canAct(room, player) {
  if (!player.alive || player.isHost) return false;
  if (room.phase !== PHASES.NIGHT) return false;

  const { nightSubPhase } = room;
  if (nightSubPhase === NIGHT_SUBPHASES.MAFIA) {
    return isMafiaTeam(player.role);
  }
  if (nightSubPhase === NIGHT_SUBPHASES.DON) return player.role === 'don';
  if (nightSubPhase === NIGHT_SUBPHASES.SHERIFF) return player.role === 'sheriff';
  if (nightSubPhase === NIGHT_SUBPHASES.DOCTOR) return player.role === 'doctor';
  return false;
}

export function submitNightAction(room, playerId, targetId) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player || !canAct(room, player)) return { error: 'Сейчас вы не можете ходить' };

  const target = room.players.find((p) => p.id === targetId);
  if (!target || !target.alive || target.isHost) return { error: 'Неверная цель' };
  if (targetId === playerId && room.nightSubPhase !== NIGHT_SUBPHASES.DOCTOR) {
    return { error: 'Нельзя выбрать себя' };
  }

  const { nightSubPhase } = room;

  if (nightSubPhase === NIGHT_SUBPHASES.MAFIA) {
    if (!isMafiaTeam(player.role)) return { error: 'Не ваш ход' };
    room.nightActions.mafia = targetId;
    room.nightActions.mafiaVoters = room.nightActions.mafiaVoters || {};
    room.nightActions.mafiaVoters[playerId] = targetId;
    return { success: true };
  }

  if (nightSubPhase === NIGHT_SUBPHASES.DON) {
    room.nightActions.donCheck = targetId;
    const isSheriff = target.role === 'sheriff';
    return { success: true, checkResult: isSheriff ? 'sheriff' : 'not_sheriff' };
  }

  if (nightSubPhase === NIGHT_SUBPHASES.SHERIFF) {
    room.nightActions.sheriffCheck = targetId;
    const isMafia = isMafiaTeam(target.role);
    return { success: true, checkResult: isMafia ? 'mafia' : 'civilian' };
  }

  if (nightSubPhase === NIGHT_SUBPHASES.DOCTOR) {
    room.nightActions.doctor = targetId;
    return { success: true };
  }

  return { error: 'Неизвестная фаза' };
}

export function advanceNightPhase(room) {
  const order = [
    NIGHT_SUBPHASES.MAFIA,
    NIGHT_SUBPHASES.DON,
    NIGHT_SUBPHASES.SHERIFF,
    NIGHT_SUBPHASES.DOCTOR,
    NIGHT_SUBPHASES.RESOLVE,
  ];

  const hasRole = (role) => room.players.some((p) => p.alive && !p.isHost && p.role === role);
  const skipMap = {
    [NIGHT_SUBPHASES.DON]: () => !hasRole('don'),
    [NIGHT_SUBPHASES.SHERIFF]: () => !hasRole('sheriff'),
    [NIGHT_SUBPHASES.DOCTOR]: () => !hasRole('doctor') || !room.settings.includeDoctor,
  };

  let idx = order.indexOf(room.nightSubPhase);
  if (idx === -1) idx = 0;

  do {
    idx++;
    if (idx >= order.length) break;
  } while (skipMap[order[idx]]?.());

  if (idx >= order.length || order[idx] === NIGHT_SUBPHASES.RESOLVE) {
    room.nightSubPhase = NIGHT_SUBPHASES.RESOLVE;
  } else {
    room.nightSubPhase = order[idx];
  }
}

export function resolveNight(room) {
  let mafiaTarget = room.nightActions.mafia;
  if (room.nightActions.mafiaVoters) {
    const counts = {};
    Object.values(room.nightActions.mafiaVoters).forEach((id) => {
      counts[id] = (counts[id] || 0) + 1;
    });
    let max = 0;
    for (const [id, count] of Object.entries(counts)) {
      if (count > max) {
        max = count;
        mafiaTarget = id;
      }
    }
  }
  const doctorTarget = room.nightActions.doctor;
  let killed = null;

  if (mafiaTarget && mafiaTarget !== doctorTarget) {
    const victim = room.players.find((p) => p.id === mafiaTarget);
    if (victim && victim.alive) {
      victim.alive = false;
      victim.deathReason = 'killed';
      victim.deathPhase = 'night';
      killed = victim;
    }
  }

  room.lastNightResult = {
    peaceful: !killed,
    killedId: killed?.id || null,
    killedName: killed?.nickname || null,
  };

  const winner = checkWin(room.players);
  if (winner) {
    room.phase = PHASES.ENDED;
    room.winner = winner;
    return { killed, winner };
  }

  room.phase = PHASES.DAY;
  room.nightSubPhase = null;
  return { killed, winner: null };
}

export function startVoting(room) {
  room.phase = PHASES.VOTING;
  room.votes = {};
}

export function submitVote(room, voterId, targetId) {
  const voter = room.players.find((p) => p.id === voterId);
  if (!voter || !voter.alive || voter.isHost) return { error: 'Вы не можете голосовать' };
  if (room.phase !== PHASES.VOTING) return { error: 'Сейчас не голосование' };

  const target = room.players.find((p) => p.id === targetId);
  if (!target || !target.alive || target.isHost) return { error: 'Неверная цель' };

  room.votes[voterId] = targetId;
  return { success: true };
}

export function resolveVoting(room) {
  const voteCounts = {};
  Object.values(room.votes).forEach((id) => {
    voteCounts[id] = (voteCounts[id] || 0) + 1;
  });

  let maxVotes = 0;
  let exiledId = null;
  let tie = false;

  for (const [id, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      exiledId = id;
      tie = false;
    } else if (count === maxVotes && maxVotes > 0) {
      tie = true;
    }
  }

  let exiled = null;
  if (exiledId && !tie && maxVotes > 0) {
    exiled = room.players.find((p) => p.id === exiledId);
    if (exiled) {
      exiled.alive = false;
      exiled.deathReason = 'voted';
      exiled.deathPhase = 'day';
    }
  }

  room.lastVoteResult = {
    exiledId: exiled?.id || null,
    exiledName: exiled?.nickname || null,
    tie,
    voteCounts,
  };

  const winner = checkWin(room.players);
  if (winner) {
    room.phase = PHASES.ENDED;
    room.winner = winner;
    return { exiled, winner };
  }

  startNight(room);
  return { exiled, winner: null };
}

export function serializeRoom(room, viewerId = null, isOverlay = false) {
  const viewer = room.players.find((p) => p.id === viewerId);
  const isHost = viewer?.isHost || false;

  const players = room.players.map((p) => {
    const base = {
      id: p.id,
      nickname: p.nickname,
      slot: p.slot,
      isHost: p.isHost,
      isCreator: p.isCreator,
      alive: p.alive,
      deathReason: p.deathReason,
      deathPhase: p.deathPhase,
      connected: p.connected,
      hasCamera: !!p.cameraStreamId,
      cameraStreamId: p.cameraStreamId,
      cameraViewUrl: isOverlay || p.id === viewerId ? p.cameraViewUrl : null,
    };

    if (isOverlay || isHost) {
      base.role = p.role;
    } else if (viewer) {
      if (p.id === viewerId) {
        base.role = p.role;
      } else if (viewer.role && isMafiaTeam(viewer.role) && isMafiaTeam(p.role)) {
        base.role = p.role;
        base.isTeammate = true;
      }
    }

    return base;
  });

  return {
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
    roleRevealIndex: room.roleRevealIndex,
    hostVotes: room.hostVotes,
    playerCount: room.players.length,
    gamePlayerCount: room.players.filter((p) => !p.isHost).length,
    canStart: room.players.filter((p) => !p.isHost).length >= MIN_PLAYERS,
  };
}

export function removePlayer(socketId) {
  for (const [code, room] of rooms.entries()) {
    const player = room.players.find((p) => p.socketId === socketId);
    if (player) {
      player.connected = false;
      if (room.phase === PHASES.LOBBY) {
        room.players = room.players.filter((p) => p.id !== player.id);
        assignSlots(room.players);
        if (room.players.length === 0) {
          rooms.delete(code);
          return null;
        }
        if (room.hostId === player.id && room.players.length > 0) {
          room.players[0].isHost = true;
          room.hostId = room.players[0].id;
        }
      }
      return room;
    }
  }
  return null;
}
