import type { RoomState } from '../types';

export type ScriptActionKey =
  | 'startGame'
  | 'startNight'
  | 'advanceNight'
  | 'resolveNight'
  | 'nextSpeaker'
  | 'startVoting'
  | 'resolveVoting'
  | 'restart';

export interface ScriptStep {
  id: string;
  eyebrow: string;
  title: string;
  /** Реплики, которые ведущий читает вслух */
  lines: string[];
  /** Служебная подсказка — читать не надо */
  note?: string;
  action?: { key: ScriptActionKey; label: string; tone: 'brass' | 'primary' | 'secondary' };
  extra?: { key: ScriptActionKey; label: string };
  /** Что мешает идти дальше */
  waitLabel?: string;
}

function num(slot: number) {
  return `номер ${slot}`;
}

export function getHostScript(room: RoomState): ScriptStep {
  const { phase, nightSubPhase, dayNumber } = room;
  const alive = room.players.filter((p) => !p.isHost && p.alive).sort((a, b) => a.slot - b.slot);

  if (phase === 'lobby') {
    return {
      id: 'lobby',
      eyebrow: 'Подготовка',
      title: 'Собираем стол',
      lines: [
        'Добро пожаловать в город. Сегодня здесь будет неспокойно.',
        'Проверьте, что вы слышите и видите друг друга.',
        'Как только все займут места — я раздам карты.',
      ],
      note: `Нужно от ${room.minPlayers} до ${room.maxPlayers} игроков, не считая вас.`,
      action: { key: 'startGame', label: 'Раздать роли', tone: 'brass' },
      waitLabel: room.canStart
        ? undefined
        : `Не хватает игроков: ${Math.max(0, room.minPlayers - room.gamePlayerCount)}`,
    };
  }

  if (phase === 'roleReveal') {
    return {
      id: 'roleReveal',
      eyebrow: 'Знакомство',
      title: 'Игроки смотрят карты',
      lines: [
        'Каждый из вас получил карту. Посмотрите её и запомните.',
        'Никому не показывайте, что вам выпало.',
        'Мафия узнает своих этой ночью.',
      ],
      note: 'Кнопка станет активной, когда все подтвердят, что запомнили роль.',
      action: { key: 'startNight', label: 'Город засыпает', tone: 'brass' },
      waitLabel: 'Ждём, пока все посмотрят карту',
    };
  }

  if (phase === 'night') {
    const eyebrow = `Ночь ${dayNumber}`;

    if (nightSubPhase === 'mafia') {
      return {
        id: 'night-mafia',
        eyebrow: `${eyebrow} · Мафия`,
        title: 'Просыпается мафия',
        lines: [
          'Город засыпает. Все закрывают глаза.',
          'Просыпается мафия. Мафия, познакомьтесь друг с другом.',
          'Договоритесь между собой и покажите, кого вы убираете этой ночью.',
        ],
        note: 'Если мафия не сходится во мнении — решающий голос за доном.',
        action: { key: 'advanceNight', label: 'Мафия засыпает', tone: 'secondary' },
        waitLabel: 'Ждём выбор мафии',
      };
    }

    if (nightSubPhase === 'don') {
      return {
        id: 'night-don',
        eyebrow: `${eyebrow} · Дон`,
        title: 'Просыпается дон',
        lines: [
          'Мафия засыпает.',
          'Просыпается дон. Дон, покажи, кого ты проверяешь.',
          'Я отвечу тебе — шериф это или нет.',
        ],
        action: { key: 'advanceNight', label: 'Дон засыпает', tone: 'secondary' },
        waitLabel: 'Ждём проверку дона',
      };
    }

    if (nightSubPhase === 'sheriff') {
      return {
        id: 'night-sheriff',
        eyebrow: `${eyebrow} · Шериф`,
        title: 'Просыпается шериф',
        lines: [
          'Дон засыпает.',
          'Просыпается шериф. Шериф, покажи, кого ты проверяешь.',
          'Я отвечу тебе — мафия это или мирный житель.',
        ],
        action: { key: 'advanceNight', label: 'Шериф засыпает', tone: 'secondary' },
        waitLabel: 'Ждём проверку шерифа',
      };
    }

    if (nightSubPhase === 'doctor') {
      return {
        id: 'night-doctor',
        eyebrow: `${eyebrow} · Доктор`,
        title: 'Просыпается доктор',
        lines: [
          'Шериф засыпает.',
          'Просыпается доктор. Доктор, покажи, кого ты лечишь этой ночью.',
        ],
        note: 'Себя доктор может вылечить только один раз за игру и не может лечить одного и того же две ночи подряд.',
        action: { key: 'advanceNight', label: 'Доктор засыпает', tone: 'secondary' },
        waitLabel: 'Ждём ход доктора',
      };
    }

    return {
      id: 'night-resolve',
      eyebrow: `${eyebrow} · Итоги`,
      title: 'Ночь закончилась',
      lines: ['Все закрывают глаза.', 'Ночь окончена. Город просыпается.'],
      note: 'Нажмите — и город узнает, чем закончилась ночь.',
      action: { key: 'resolveNight', label: 'Объявить утро', tone: 'brass' },
    };
  }

  if (phase === 'day') {
    const result = room.lastNightResult;
    const first = alive[0];
    const lines = [
      result && !result.peaceful
        ? `Доброе утро, город. Этой ночью мы потеряли игрока ${result.killedName}, ${num(result.killedSlot || 0)}.`
        : 'Доброе утро, город. Этой ночью все остались живы.',
      `За столом осталось ${alive.length} игроков.`,
    ];
    if (room.speaking) {
      lines.push(`Слово игроку ${room.speaking.nickname}, ${num(room.speaking.slot)}.`);
    } else if (first) {
      lines.push(`Начинаем обсуждение. Первым говорит игрок ${first.nickname}, ${num(first.slot)}.`);
    }

    return {
      id: 'day',
      eyebrow: `День ${dayNumber}`,
      title: 'Обсуждение',
      lines,
      note: 'Передавайте слово по кругу, затем переходите к голосованию.',
      action: { key: 'startVoting', label: 'Перейти к голосованию', tone: 'brass' },
      extra: { key: 'nextSpeaker', label: room.speaking ? 'Следующий говорит' : 'Дать слово первому' },
    };
  }

  if (phase === 'voting') {
    const revote = room.revoteRound > 0;
    const candidates = room.voteCandidateIds
      ? room.players
          .filter((p) => room.voteCandidateIds?.includes(p.id))
          .map((p) => `${p.nickname} (${num(p.slot)})`)
          .join(', ')
      : '';

    return {
      id: 'voting',
      eyebrow: `День ${dayNumber} · Голосование`,
      title: revote ? 'Переголосовка' : 'Голосование',
      lines: revote
        ? [
            `Голоса разделились: ${candidates}.`,
            'Голосуем ещё раз — только за этих игроков.',
            'Если снова будет ничья, сегодня никто не покинет город.',
          ]
        : [
            'Переходим к голосованию.',
            'Каждый выбирает одного игрока. Изменить голос уже нельзя.',
            'Кто не определился — может воздержаться.',
          ],
      note: 'Кнопка загорится, когда проголосуют все живые.',
      action: { key: 'resolveVoting', label: 'Объявить результат', tone: 'brass' },
      waitLabel: 'Ждём голоса',
    };
  }

  return {
    id: 'ended',
    eyebrow: 'Финал',
    title: room.winner === 'city' ? 'Победа города' : 'Победа мафии',
    lines: [
      'Игра окончена.',
      room.winner === 'city'
        ? 'Город нашёл всю мафию. Победа города.'
        : 'Мафии стало столько же, сколько мирных. Победа мафии.',
      'Открываем карты — все роли теперь видны.',
    ],
    action: { key: 'restart', label: 'Собрать новый стол', tone: 'brass' },
  };
}
