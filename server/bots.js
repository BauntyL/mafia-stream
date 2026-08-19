import { PHASES, NIGHT_SUBPHASES, isMafiaTeam, shuffle } from './constants.js';
import {
  getStepActors,
  getVoteCandidates,
  submitNightAction,
  submitVote,
  markRoleSeen,
  addChatMessage,
} from './rooms.js';

const LINES = [
  'Пока никого не читаю, слушаю город.',
  'Мне не нравится, как отвечает {name}.',
  'Я мирный, могу только рассуждать.',
  'Ночь тихая — похоже, доктор работает.',
  'Предлагаю не спешить с голосованием.',
  'У {name} слишком удобная позиция.',
  'Готов слушать проверки, если они есть.',
  '{name}, объяснись по вчерашнему голосованию.',
];

const pick = (list) => (list.length ? list[Math.floor(Math.random() * list.length)] : null);

const checkedIds = (room, botId) =>
  new Set((room.checks[botId] || []).map((c) => c.targetId));

function nightCandidates(room, bot) {
  const alive = room.players.filter((p) => !p.isHost && p.alive);

  switch (room.nightSubPhase) {
    case NIGHT_SUBPHASES.MAFIA:
      return alive.filter((p) => !isMafiaTeam(p.role));

    case NIGHT_SUBPHASES.DON: {
      const seen = checkedIds(room, bot.id);
      const fresh = alive.filter(
        (p) => p.id !== bot.id && !isMafiaTeam(p.role) && !seen.has(p.id),
      );
      return fresh.length ? fresh : alive.filter((p) => p.id !== bot.id);
    }

    case NIGHT_SUBPHASES.SHERIFF: {
      const seen = checkedIds(room, bot.id);
      const fresh = alive.filter((p) => p.id !== bot.id && !seen.has(p.id));
      return fresh.length ? fresh : alive.filter((p) => p.id !== bot.id);
    }

    case NIGHT_SUBPHASES.DOCTOR:
      return alive.filter((p) => p.id !== room.lastDoctorTarget);

    default:
      return [];
  }
}

function actAtNight(room, bot) {
  for (const target of shuffle(nightCandidates(room, bot))) {
    if (!submitNightAction(room, bot.id, target.id).error) return true;
  }
  return !submitNightAction(room, bot.id, null).error;
}

function actAtVoting(room, bot) {
  const candidates = getVoteCandidates(room).filter((p) => p.id !== bot.id);

  // Если бот кого-то поймал проверкой — голосует за него
  const exposed = (room.checks[bot.id] || [])
    .filter((c) => c.result === 'mafia')
    .map((c) => c.targetId);
  const priority = candidates.filter((p) => exposed.includes(p.id));

  let pool = priority.length ? priority : candidates;
  if (isMafiaTeam(bot.role)) {
    const outsiders = pool.filter((p) => !isMafiaTeam(p.role));
    if (outsiders.length) pool = outsiders;
  }

  for (const target of shuffle(pool)) {
    if (!submitVote(room, bot.id, target.id).error) return true;
  }
  return !submitVote(room, bot.id, null).error;
}

/**
 * Один «тик» жизни ботов: за вызов ходит максимум один бот,
 * чтобы со стороны это выглядело как живой стол, а не мгновенный автоответ.
 * Возвращает true, если состояние комнаты изменилось.
 */
export function runBots(room) {
  const bots = room.players.filter((p) => p.isBot);
  if (bots.length === 0) return false;

  if (room.phase === PHASES.ROLE_REVEAL) {
    let changed = false;
    bots.forEach((bot) => {
      if (!bot.roleSeen) {
        markRoleSeen(room, bot.id);
        changed = true;
      }
    });
    return changed;
  }

  if (room.phase === PHASES.NIGHT) {
    const actor = getStepActors(room).find((p) => p.isBot && !room.actedThisStep[p.id]);
    return actor ? actAtNight(room, actor) : false;
  }

  if (room.phase === PHASES.VOTING) {
    const voter = bots.find((p) => p.alive && !room.votes[p.id]);
    return voter ? actAtVoting(room, voter) : false;
  }

  if (room.phase === PHASES.DAY && room.settings.chatEnabled) {
    const talker = bots.find((p) => p.alive && p.lastChatDay !== room.dayNumber);
    if (!talker) return false;
    talker.lastChatDay = room.dayNumber;
    const others = room.players.filter((p) => !p.isHost && p.alive && p.id !== talker.id);
    const line = pick(LINES).replace('{name}', pick(others)?.nickname || 'соседа');
    return !addChatMessage(room, talker.id, line).error;
  }

  return false;
}
