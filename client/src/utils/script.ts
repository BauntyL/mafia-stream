import type { RoomState } from '../types';

export type ScriptActionKey =
  | 'startGame'
  | 'startNight'
  | 'advanceNight'
  | 'resolveNight'
  | 'nextSpeaker'
  | 'startVoting'
  | 'skipNarrator'
  | 'resolveVoting'
  | 'restart';

/** Сцена на экране. У сцены может быть несколько файлов озвучки подряд. */
export type NarratorScene =
  | 'lobby'
  | 'roles'
  | 'night-mafia-1'
  | 'night-mafia'
  | 'night-don'
  | 'night-sheriff'
  | 'night-doctor'
  | 'night-end'
  | 'dawn-alive'
  | 'dawn-dead'
  | 'day'
  | 'vote'
  | 'vote-again'
  | 'end-city'
  | 'end-mafia';

/** Стабильный id файла: /audio/narrator/{id}.mp3. Не длиннее 500 символов текста. */
export type NarratorId = NarratorScene | 'lobby-2' | 'roles-2' | 'night-mafia-1-2';

export const MAX_NARRATOR_CHARS = 500;

export interface NarratorBlock {
  id: NarratorId;
  scene: NarratorScene;
  title: string;
  when: string;
  /** Точный текст для озвучки — не больше 500 символов */
  text: string;
}

export const NARRATOR_BLOCKS: NarratorBlock[] = [
  {
    id: 'lobby',
    scene: 'lobby',
    title: 'Сбор стола · 1',
    when: 'Лобби, пока игроки заходят. Сразу после него — lobby-2.',
    text: [
      'Город ещё не спит.',
      'За этим столом сегодня решат, кому дожить до утра — а кому исчезнуть без следа.',
      'Проверьте, что вас слышно. Камера — по желанию. Без неё тоже играют: вместо лица будет портрет.',
      'Запомните лица. Запомните голоса. Запомните, кто шутит слишком громко.',
      'Когда все займут места, я раздам карты.',
      'После этого пути назад не будет.',
    ].join('\n'),
  },
  {
    id: 'lobby-2',
    scene: 'lobby',
    title: 'Сбор стола · 2',
    when: 'Лобби, сразу после lobby.',
    text: [
      'Кто сел за этот стол — уже часть города. Друзей здесь нет. Есть ночь и те, кто её переживёт.',
      'Пока ждём остальных, молчите о будущем. Ролей ещё нет — но подозрение уже садится рядом.',
    ].join('\n'),
  },
  {
    id: 'roles',
    scene: 'roles',
    title: 'Раздача ролей · 1',
    when: 'Игроки открывают карты. Сразу после него — roles-2.',
    text: [
      'Карты розданы.',
      'Посмотрите свою. Только свою. И запомните, кем вы стали этой ночью.',
      'Никому не показывайте. Не называйте роль вслух. Даже намёком. Даже шуткой.',
      'Мафия найдёт своих, когда город заснёт. Остальные узнают правду слишком поздно — или не узнают вовсе.',
    ].join('\n'),
  },
  {
    id: 'roles-2',
    scene: 'roles',
    title: 'Раздача ролей · 2',
    when: 'Раздача ролей, сразу после roles.',
    text: [
      'Если вы мирный — ваша сила в голосе днём. Если вы в тени — ваша сила в тишине.',
      'Не пишите роль в чат. Не показывайте экран. Карта принадлежит только вам.',
      'Когда запомните — подтвердите. Город уже зевает.',
    ].join('\n'),
  },
  {
    id: 'night-mafia-1',
    scene: 'night-mafia-1',
    title: 'Первая ночь · мафия · 1',
    when: 'Ночь 1, ход мафии. Сразу после него — night-mafia-1-2.',
    text: [
      'Город засыпает. Все закрывают глаза.',
      'Никто не шевелится. Никто не подглядывает. Кто откроет глаза без спроса — того город запомнит.',
      'Просыпается мафия.',
      'Мафия, откройте глаза. Посмотрите друг на друга. Запомните своих — днём вы будете врагами, ночью вы одна кровь.',
    ].join('\n'),
  },
  {
    id: 'night-mafia-1-2',
    scene: 'night-mafia-1',
    title: 'Первая ночь · мафия · 2',
    when: 'Ночь 1, ход мафии, сразу после night-mafia-1.',
    text: [
      'Договоритесь молча и покажите, кого этой ночью не станет.',
      'Город вас не видит. Но утром город вас услышит.',
      'Если среди вас дон — слушайте его. Слово дона в тени сильнее спора.',
    ].join('\n'),
  },
  {
    id: 'night-mafia',
    scene: 'night-mafia',
    title: 'Ночь · мафия',
    when: 'Ночь 2 и дальше, ход мафии',
    text: [
      'Город засыпает. Все закрывают глаза.',
      'Просыпается мафия.',
      'Мафия, ночь снова ваша. Выберите, кто не доживёт до утра.',
      'Покажите на жертву. Если не сойдётесь — слово за доном.',
      'Не тяните. Каждая лишняя секунда выдаёт вас лучше любого слова.',
      'Утро всё равно придёт. Пусть оно придёт без одного лишнего свидетеля.',
    ].join('\n'),
  },
  {
    id: 'night-don',
    scene: 'night-don',
    title: 'Ночь · дон',
    when: 'Ход дона',
    text: [
      'Мафия засыпает. Все закрывают глаза.',
      'Просыпается дон.',
      'Дон, ты ищешь шерифа. Одного. За эту ночь — одну проверку.',
      'Покажи на игрока.',
      'Я кивну, если это шериф. Покачаю головой, если нет.',
      'Выбирай точно. Ошибка будет стоить городу крови — или тебе головы.',
      'Шериф днём опаснее всей мафии вместе. Найди его, пока он не нашёл вас.',
    ].join('\n'),
  },
  {
    id: 'night-sheriff',
    scene: 'night-sheriff',
    title: 'Ночь · шериф',
    when: 'Ход шерифа',
    text: [
      'Дон засыпает.',
      'Просыпается шериф.',
      'Шериф, ты ищешь мафию. Город спит, и только ты не имеешь права ошибиться.',
      'Покажи на игрока.',
      'Я кивну, если это мафия. Покачаю головой, если мирный житель.',
      'Дон для тебя выглядит как мафия. Помни об этом.',
      'Не проверяй наугад. Одна ночь — одна правда. Завтра ночь даст тебе ещё одну.',
    ].join('\n'),
  },
  {
    id: 'night-doctor',
    scene: 'night-doctor',
    title: 'Ночь · доктор',
    when: 'Ход доктора. Если доктора в партии нет — блок не звучит.',
    text: [
      'Шериф засыпает.',
      'Просыпается доктор.',
      'Доктор, этой ночью ты можешь спасти одну жизнь. Всего одну.',
      'Покажи, кого лечишь.',
      'Себя — только раз за игру. Одного и того же две ночи подряд лечить нельзя.',
      'Город надеется на тебя. Даже если город об этом не знает.',
      'Если угадаешь жертву — утро будет тихим. Если нет — утро будет с телом.',
    ].join('\n'),
  },
  {
    id: 'night-end',
    scene: 'night-end',
    title: 'Ночь кончается',
    when: 'Перед объявлением утра',
    text: [
      'Все засыпают.',
      'Ночь заканчивает свою работу. Кто-то уже не дышит. Кто-то ещё не знает, что спасён.',
      'Город просыпается. Откройте глаза.',
      'Сейчас вы узнаете, кто не дожил до утра — и дожил ли хоть кто-то.',
      'Смотрите друг на друга. Кто слишком спокоен — тоже улика. Кто слишком бледен — тоже.',
    ].join('\n'),
  },
  {
    id: 'dawn-alive',
    scene: 'dawn-alive',
    title: 'Утро · все живы',
    when: 'День после спокойной ночи. Сразу после него играется day.',
    text: [
      'Доброе утро, город.',
      'Этой ночью все остались живы.',
      'Кто-то из тёмных промахнулся. Или доктор успел вовремя. Или город ещё не заслужил крови.',
      'Не расслабляйтесь. Спокойная ночь — тоже улика.',
      'Кто-то из вас знает, почему все живы. Остальные могут только гадать. Гадайте вслух.',
    ].join('\n'),
  },
  {
    id: 'dawn-dead',
    scene: 'dawn-dead',
    title: 'Утро · убийство',
    when: 'День после ночного убийства. Имя на экране отдельно. Сразу после него играется day.',
    text: [
      'Доброе утро, город.',
      'Этой ночью мы потеряли одного из своих.',
      'Тело нашли на рассвете. Кто это был — сейчас на столе.',
      'Говорите. Ищите. Не дайте ночи забрать ещё одного.',
      'Молчание после смерти — подарок мафии. Город, который молчит, умирает быстрее.',
    ].join('\n'),
  },
  {
    id: 'day',
    scene: 'day',
    title: 'День · обсуждение',
    when: 'После объявления утра, обсуждение',
    text: [
      'День. Время слов.',
      'Каждый живой имеет право быть услышанным. Слушайте не то, что говорят — то, чего не говорят.',
      'Ищите союзников. Ищите трещины. Мафия сидит среди вас и кивает в такт.',
      'Когда закончите — город будет голосовать. Голос нельзя забрать назад.',
      'Не бойтесь ошибиться словом. Бойтесь отдать голос вслепую. Слово ещё можно поправить. Голос — нет.',
    ].join('\n'),
  },
  {
    id: 'vote',
    scene: 'vote',
    title: 'Голосование',
    when: 'Первое голосование дня',
    text: [
      'Переходим к голосованию.',
      'Каждый живой выбирает одного. Изменить выбор уже нельзя.',
      'Не знаете, за кого — можете воздержаться. Молчание тоже решение.',
      'Город изгоняет того, на ком сойдётся большинство.',
      'Смотрите, кто голосует слишком быстро. И кто слишком долго не может поднять руку.',
    ].join('\n'),
  },
  {
    id: 'vote-again',
    scene: 'vote-again',
    title: 'Переголосовка',
    when: 'Ничья на голосовании',
    text: [
      'Голоса разделились. Никто не уходит — пока.',
      'Голосуем ещё раз. Только за тех, кто разделил первое место.',
      'Если снова будет ничья, сегодня город никого не изгонит.',
      'Ночь придёт за всеми одинаково.',
      'Переголосовка — последний шанс. Город, который не умеет выбирать, кормит мафию до утра.',
    ].join('\n'),
  },
  {
    id: 'end-city',
    scene: 'end-city',
    title: 'Победа города',
    when: 'Финал, победили мирные',
    text: [
      'Игра окончена.',
      'Город победил. Мафия найдена. Улицы снова принадлежат живым.',
      'Открываем карты.',
      'Посмотрите, кому вы верили — и кто улыбался вам до последнего дня.',
      'Кто-то из вас был прав с первой ночи. Кто-то ошибался до конца. И то и другое — тоже история.',
    ].join('\n'),
  },
  {
    id: 'end-mafia',
    scene: 'end-mafia',
    title: 'Победа мафии',
    when: 'Финал, победила мафия',
    text: [
      'Игра окончена.',
      'Мафия победила. Тёмных стало столько же, сколько светлых. Городу больше некого спасать.',
      'Открываем карты.',
      'Это была хорошая охота.',
      'Город говорил, спорил, голосовал — и всё равно остался в меньшинстве. Так бывает, когда тень умеет кивать вместе со всеми.',
    ].join('\n'),
  },
];

const BLOCK_MAP = Object.fromEntries(NARRATOR_BLOCKS.map((b) => [b.id, b])) as Record<
  NarratorId,
  NarratorBlock
>;

export function narratorFile(id: NarratorId) {
  return `/audio/narrator/${id}.mp3`;
}

/** Длительности файлов из voice/, мс. Должны совпадать с server/narrator.js */
export const NARRATOR_DURATION_MS: Record<NarratorId, number> = {
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

export function getNarratorDurationMs(ids: NarratorId[]) {
  return ids.reduce((sum, id) => sum + (NARRATOR_DURATION_MS[id] || 0), 0);
}

export function narratorCharCount(text: string) {
  return [...text].length;
}

export function getSceneQueue(scene: NarratorScene): NarratorId[] {
  return NARRATOR_BLOCKS.filter((b) => b.scene === scene).map((b) => b.id);
}

export function getNarratorQueue(room: RoomState): NarratorId[] {
  if (room.settings?.narratorEnabled === false) return [];

  if (room.phase === 'night' && room.nightSubPhase === 'mafia' && room.dayNumber <= 1 && room.settings.peacefulFirstNight) {
    return ['night-mafia-1'];
  }

  if (room.phase === 'day') {
    const dawn: NarratorScene =
      room.lastNightResult && !room.lastNightResult.peaceful ? 'dawn-dead' : 'dawn-alive';
    return [...getSceneQueue(dawn), ...getSceneQueue('day')];
  }
  const scene = getNarratorScene(room);
  return scene ? getSceneQueue(scene) : [];
}

export function getNarratorScene(room: RoomState): NarratorScene | null {
  const { phase, nightSubPhase, dayNumber } = room;

  if (phase === 'lobby') return 'lobby';
  if (phase === 'roleReveal') return 'roles';

  if (phase === 'night') {
    if (nightSubPhase === 'mafia') return dayNumber <= 1 ? 'night-mafia-1' : 'night-mafia';
    if (nightSubPhase === 'don') return 'night-don';
    if (nightSubPhase === 'sheriff') return 'night-sheriff';
    if (nightSubPhase === 'doctor') return 'night-doctor';
    if (nightSubPhase === 'resolve') return 'night-end';
    return 'night-mafia';
  }

  if (phase === 'day') {
    if (room.lastNightResult && !room.lastNightResult.peaceful) return 'dawn-dead';
    if (room.lastNightResult?.peaceful) return 'dawn-alive';
    return 'day';
  }

  if (phase === 'voting') return room.revoteRound > 0 ? 'vote-again' : 'vote';

  if (phase === 'ended') return room.winner === 'mafia' ? 'end-mafia' : 'end-city';

  return null;
}

export function getNarratorId(room: RoomState): NarratorId | null {
  return getNarratorQueue(room)[0] ?? null;
}

export interface ScriptStep {
  id: string;
  voiceId: NarratorId | null;
  eyebrow: string;
  title: string;
  /** Реплики диктора — совпадают с озвучкой */
  lines: string[];
  /** Живые подстановки: имена, номера. Не озвучиваются. */
  liveLines?: string[];
  note?: string;
  action?: { key: ScriptActionKey; label: string; tone: 'brass' | 'primary' | 'secondary' };
  extra?: { key: ScriptActionKey; label: string };
  waitLabel?: string;
}

function num(slot: number) {
  return `номер ${slot}`;
}

function linesForScene(scene: NarratorScene) {
  return getSceneQueue(scene).flatMap((id) => BLOCK_MAP[id].text.split('\n'));
}

function fromScene(
  scene: NarratorScene,
  extra: Omit<ScriptStep, 'id' | 'voiceId' | 'lines'>,
): ScriptStep {
  const ids = getSceneQueue(scene);
  return {
    id: scene,
    voiceId: ids[0] ?? null,
    lines: linesForScene(scene),
    ...extra,
  };
}

export function getHostScript(room: RoomState): ScriptStep {
  const { phase, nightSubPhase, dayNumber } = room;
  const alive = room.players.filter((p) => !p.isHost && p.alive).sort((a, b) => a.slot - b.slot);

  if (phase === 'lobby') {
    return fromScene('lobby', {
      eyebrow: 'Подготовка',
      title: 'Собираем стол',
      note: `Нужно от ${room.minPlayers} до ${room.maxPlayers} игроков, не считая вас.`,
      action: { key: 'startGame', label: 'Раздать роли', tone: 'brass' },
      waitLabel: room.canStart
        ? undefined
        : `Не хватает игроков: ${Math.max(0, room.minPlayers - room.gamePlayerCount)}`,
    });
  }

  if (phase === 'roleReveal') {
    return fromScene('roles', {
      eyebrow: 'Знакомство',
      title: 'Игроки смотрят карты',
      note: 'Кнопка станет активной, когда все подтвердят, что запомнили роль.',
      action: { key: 'startNight', label: 'Город засыпает', tone: 'brass' },
      waitLabel: 'Ждём, пока все посмотрят карту',
    });
  }

  if (phase === 'night') {
    const eyebrow = `Ночь ${dayNumber}`;

    if (nightSubPhase === 'mafia') {
      const first = dayNumber <= 1;
      const peaceful = first && room.settings.peacefulFirstNight;
      if (peaceful) {
        return {
          id: 'night-mafia-1',
          voiceId: 'night-mafia-1',
          eyebrow: `${eyebrow} · Мафия`,
          title: 'Первая ночь. Мафия знакомится',
          lines: BLOCK_MAP['night-mafia-1'].text.split('\n'),
          note: 'Выстрела нет. Пусть посмотрят друг на друга и закроют глаза.',
          action: { key: 'advanceNight', label: 'Мафия засыпает', tone: 'secondary' },
          waitLabel: 'Ждём, пока мафия познакомится',
        };
      }
      return fromScene(first ? 'night-mafia-1' : 'night-mafia', {
        eyebrow: `${eyebrow} · Мафия`,
        title: first ? 'Первая ночь. Просыпается мафия' : 'Просыпается мафия',
        note: 'Если мафия не сходится — решающий голос за доном.',
        action: { key: 'advanceNight', label: 'Мафия засыпает', tone: 'secondary' },
        waitLabel: 'Ждём выбор мафии',
      });
    }

    if (nightSubPhase === 'don') {
      return fromScene('night-don', {
        eyebrow: `${eyebrow} · Дон`,
        title: 'Просыпается дон',
        action: { key: 'advanceNight', label: 'Дон засыпает', tone: 'secondary' },
        waitLabel: 'Ждём проверку дона',
      });
    }

    if (nightSubPhase === 'sheriff') {
      return fromScene('night-sheriff', {
        eyebrow: `${eyebrow} · Шериф`,
        title: 'Просыпается шериф',
        action: { key: 'advanceNight', label: 'Шериф засыпает', tone: 'secondary' },
        waitLabel: 'Ждём проверку шерифа',
      });
    }

    if (nightSubPhase === 'doctor') {
      return fromScene('night-doctor', {
        eyebrow: `${eyebrow} · Доктор`,
        title: 'Просыпается доктор',
        note: 'Себя — один раз за игру. Одного игрока — не две ночи подряд.',
        action: { key: 'advanceNight', label: 'Доктор засыпает', tone: 'secondary' },
        waitLabel: 'Ждём ход доктора',
      });
    }

    return fromScene('night-end', {
      eyebrow: `${eyebrow} · Итоги`,
      title: 'Ночь закончилась',
      note: 'Нажмите — и город узнает, чем кончилась ночь.',
      action: { key: 'resolveNight', label: 'Объявить утро', tone: 'brass' },
    });
  }

  if (phase === 'day') {
    const result = room.lastNightResult;
    const first = alive[0];
    const liveLines: string[] = [];

    if (result && !result.peaceful) {
      liveLines.push(
        `Этой ночью погиб ${result.killedName}, ${num(result.killedSlot || 0)}.`,
      );
      if (result.killedRole) {
        liveLines.push(`За столом открыли роль.`);
      }
    }

    liveLines.push(`За столом осталось ${alive.length} живых.`);

    if (room.speaking) {
      liveLines.push(`Слово игроку ${room.speaking.nickname}, ${num(room.speaking.slot)}.`);
    } else if (first) {
      liveLines.push(`Обсуждение. Первым может говорить ${first.nickname}, ${num(first.slot)}.`);
    }

    const dawnScene: NarratorScene =
      result && !result.peaceful ? 'dawn-dead' : 'dawn-alive';

    return {
      id: dawnScene,
      voiceId: getSceneQueue(dawnScene)[0] ?? null,
      eyebrow: `День ${dayNumber}`,
      title: result && !result.peaceful ? 'Город потерял своего' : 'Город проснулся',
      lines: [...linesForScene(dawnScene), ...linesForScene('day')],
      liveLines,
      note: room.settings.requireNominations
        ? 'Передавайте слово по кругу, затем — выставление кандидатов.'
        : 'Передавайте слово по кругу, затем — голосование.',
      action: {
        key: 'startVoting',
        label: room.settings.requireNominations ? 'Перейти к выставлению' : 'Перейти к голосованию',
        tone: 'brass',
      },
      extra: {
        key: 'nextSpeaker',
        label: room.speaking ? 'Следующий говорит' : 'Дать слово первому',
      },
    };
  }

  if (phase === 'nominating') {
    const names = (room.nominatedIds || [])
      .map((id) => room.players.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => `${p!.nickname} (${num(p!.slot)})`);
    const liveLines: string[] = [];
    if (names.length) liveLines.push(`На голосовании: ${names.join(', ')}.`);
    else liveLines.push('Пока никто не выставлен.');

    return {
      id: 'nominating',
      voiceId: null,
      eyebrow: `День ${dayNumber} · Выставление`,
      title: 'Кого ставим на голосование',
      lines: [
        'Игроки выставляют кандидатов.',
        'Голосовать будут только за тех, кого выставили.',
        'Если стол промолчит — ночь придёт без изгнания.',
      ],
      liveLines,
      note: 'Можно закрыть выставление, не дожидаясь всех.',
      action: {
        key: 'startVoting',
        label: names.length ? 'Закрыть выставление' : 'Никто не выставлен — ночь',
        tone: 'brass',
      },
      waitLabel: 'Ждём выставления',
    };
  }

  if (phase === 'voting') {
    const revote = room.revoteRound > 0;
    const liveLines: string[] = [];
    if (revote && room.voteCandidateIds) {
      const names = room.players
        .filter((p) => room.voteCandidateIds?.includes(p.id))
        .map((p) => `${p.nickname} (${num(p.slot)})`)
        .join(', ');
      if (names) liveLines.push(`В переголосовке: ${names}.`);
    }

    return fromScene(revote ? 'vote-again' : 'vote', {
      eyebrow: `День ${dayNumber} · Голосование`,
      title: revote ? 'Переголосовка' : 'Голосование',
      liveLines,
      note: 'Кнопка загорится, когда проголосуют все живые.',
      action: { key: 'resolveVoting', label: 'Объявить результат', tone: 'brass' },
      waitLabel: 'Ждём голоса',
    });
  }

  return fromScene(room.winner === 'mafia' ? 'end-mafia' : 'end-city', {
    eyebrow: 'Финал',
    title: room.winner === 'city' ? 'Победа города' : 'Победа мафии',
    action: { key: 'restart', label: 'Собрать новый стол', tone: 'brass' },
  });
}
