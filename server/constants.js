export const ROLES = {
  CIVILIAN: 'civilian',
  MAFIA: 'mafia',
  DON: 'don',
  SHERIFF: 'sheriff',
  DOCTOR: 'doctor',
};

export const ROLE_LABELS = {
  civilian: 'Мирный житель',
  mafia: 'Мафия',
  don: 'Дон',
  sheriff: 'Шериф',
  doctor: 'Доктор',
};

export const PHASES = {
  LOBBY: 'lobby',
  ROLE_REVEAL: 'roleReveal',
  NIGHT: 'night',
  DAY: 'day',
  VOTING: 'voting',
  ENDED: 'ended',
};

export const NIGHT_SUBPHASES = {
  MAFIA: 'mafia',
  DON: 'don',
  SHERIFF: 'sheriff',
  DOCTOR: 'doctor',
  RESOLVE: 'resolve',
};

export const MIN_PLAYERS = 6;
export const MAX_PLAYERS = 12;

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generatePlayerId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getRoleDistribution(playerCount, includeDoctor = true) {
  const mafiaRegular = Math.max(1, Math.floor((playerCount - 4) / 2));
  const roles = [];
  roles.push(ROLES.DON);
  for (let i = 0; i < mafiaRegular; i++) roles.push(ROLES.MAFIA);
  roles.push(ROLES.SHERIFF);
  if (includeDoctor) roles.push(ROLES.DOCTOR);
  while (roles.length < playerCount) roles.push(ROLES.CIVILIAN);
  return roles.slice(0, playerCount);
}

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function isMafiaTeam(role) {
  return role === ROLES.MAFIA || role === ROLES.DON;
}

export function getMafiaCount(players) {
  return players.filter((p) => p.alive && isMafiaTeam(p.role)).length;
}

export function getCityCount(players) {
  return players.filter((p) => p.alive && !isMafiaTeam(p.role)).length;
}

export function checkWin(players) {
  const mafia = getMafiaCount(players);
  const city = getCityCount(players);
  if (mafia === 0) return 'city';
  if (mafia >= city) return 'mafia';
  return null;
}

export function getPhaseHint(phase, nightSubPhase, role) {
  if (phase === PHASES.LOBBY) return 'Дождитесь начала игры';
  if (phase === PHASES.ROLE_REVEAL) return 'Посмотрите свою карту роли';
  if (phase === PHASES.NIGHT) {
    if (nightSubPhase === NIGHT_SUBPHASES.MAFIA) {
      if (role === ROLES.DON || role === ROLES.MAFIA) return 'Выберите жертву мафии';
      return 'Мафия делает свой ход. Ждите...';
    }
    if (nightSubPhase === NIGHT_SUBPHASES.DON) {
      if (role === ROLES.DON) return 'Проверьте игрока — шериф ли он?';
      return 'Дон делает ход. Ждите...';
    }
    if (nightSubPhase === NIGHT_SUBPHASES.SHERIFF) {
      if (role === ROLES.SHERIFF) return 'Проверьте игрока — мафия ли он?';
      return 'Шериф делает ход. Ждите...';
    }
    if (nightSubPhase === NIGHT_SUBPHASES.DOCTOR) {
      if (role === ROLES.DOCTOR) return 'Выберите, кого лечить этой ночью';
      return 'Доктор делает ход. Ждите...';
    }
    return 'Ночь заканчивается...';
  }
  if (phase === PHASES.DAY) return 'Обсуждайте и ищите мафию';
  if (phase === PHASES.VOTING) return 'Голосуйте, кого изгнать';
  if (phase === PHASES.ENDED) return 'Игра окончена';
  return '';
}
