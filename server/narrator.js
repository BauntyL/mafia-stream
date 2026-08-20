/** Длительности voice/*.mp3 в миллисекундах. Смена сцены ждёт сумму текущей очереди. */
export const NARRATOR_DURATION_MS = {
  lobby: 29727,
  'lobby-2': 16980,
  roles: 22178,
  'roles-2': 17580,
  'night-mafia-1': 23484,
  'night-mafia-1-2': 14028,
  'night-mafia': 27638,
  'night-don': 29544,
  'night-sheriff': 27350,
  'night-doctor': 26776,
  'night-end': 24268,
  'dawn-alive': 24660,
  'dawn-dead': 21577,
  day: 30276,
  vote: 20976,
  'vote-again': 22230,
  'end-city': 20376,
  'end-mafia': 21002,
};

const PAD_MS = 500;

export function narratorQueue(room) {
  if (room.settings?.narratorEnabled === false) return [];

  const { phase, nightSubPhase, dayNumber, lastNightResult, revoteRound, winner } = room;

  if (phase === 'lobby') return ['lobby', 'lobby-2'];
  if (phase === 'roleReveal') return ['roles', 'roles-2'];

  if (phase === 'night') {
    if (nightSubPhase === 'mafia') {
      if (dayNumber > 1) return ['night-mafia'];
      return room.settings?.peacefulFirstNight ? ['night-mafia-1'] : ['night-mafia-1', 'night-mafia-1-2'];
    }
    if (nightSubPhase === 'don') return ['night-don'];
    if (nightSubPhase === 'sheriff') return ['night-sheriff'];
    if (nightSubPhase === 'doctor') return ['night-doctor'];
    if (nightSubPhase === 'resolve') return ['night-end'];
    return ['night-mafia'];
  }

  if (phase === 'day') {
    const dawn = lastNightResult && !lastNightResult.peaceful ? 'dawn-dead' : 'dawn-alive';
    return [dawn, 'day'];
  }

  if (phase === 'voting') return revoteRound > 0 ? ['vote-again'] : ['vote'];
  if (phase === 'ended') return winner === 'mafia' ? ['end-mafia'] : ['end-city'];
  return [];
}

export function narratorDurationMs(room) {
  return narratorQueue(room).reduce((sum, id) => sum + (NARRATOR_DURATION_MS[id] || 0), 0);
}

export function armNarrator(room) {
  if (room.settings?.narratorEnabled === false) {
    room.narratorEndsAt = 0;
    return;
  }
  const duration = narratorDurationMs(room);
  room.narratorEndsAt = duration > 0 ? Date.now() + duration + PAD_MS : 0;
}

export function skipNarrator(room) {
  room.narratorEndsAt = 0;
}

export function isNarratorBusy(room) {
  return Date.now() < (room.narratorEndsAt || 0);
}

export function narratorLeftMs(room) {
  return Math.max(0, (room.narratorEndsAt || 0) - Date.now());
}
