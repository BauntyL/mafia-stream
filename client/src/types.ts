export type Role = 'civilian' | 'mafia' | 'don' | 'sheriff' | 'doctor';

export type Phase = 'lobby' | 'roleReveal' | 'night' | 'day' | 'voting' | 'ended';

export type NightSubPhase = 'mafia' | 'don' | 'sheriff' | 'doctor' | 'resolve' | null;

export interface Player {
  id: string;
  nickname: string;
  slot: number;
  isHost: boolean;
  isCreator: boolean;
  alive: boolean;
  deathReason: 'killed' | 'voted' | null;
  deathPhase: 'night' | 'day' | null;
  connected: boolean;
  hasCamera: boolean;
  cameraStreamId: string | null;
  cameraViewUrl: string | null;
  role?: Role;
  isTeammate?: boolean;
}

export interface RoomState {
  code: string;
  phase: Phase;
  nightSubPhase: NightSubPhase;
  dayNumber: number;
  hostId: string;
  players: Player[];
  settings: {
    includeDoctor: boolean;
    discussionTime: number;
    showHostInOverlay: boolean;
  };
  lastNightResult: {
    peaceful: boolean;
    killedId: string | null;
    killedName: string | null;
  } | null;
  lastVoteResult: {
    exiledId: string | null;
    exiledName: string | null;
    tie: boolean;
    voteCounts: Record<string, number>;
  } | null;
  winner: 'city' | 'mafia' | null;
  roleRevealIndex: number;
  hostVotes: Record<string, string>;
  playerCount: number;
  gamePlayerCount: number;
  canStart: boolean;
}

export const ROLE_LABELS: Record<Role, string> = {
  civilian: 'Мирный житель',
  mafia: 'Мафия',
  don: 'Дон',
  sheriff: 'Шериф',
  doctor: 'Доктор',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  civilian: 'Вы мирный житель города. Днём обсуждайте и голосуйте, чтобы найти мафию. Ночью ждите.',
  mafia: 'Вы — мафия. Ночью вместе с доном выбирайте жертву. Днём притворяйтесь мирным.',
  don: 'Вы — дон мафии. Выбирайте жертву с мафией и проверяйте, кто шериф.',
  sheriff: 'Вы — шериф. Ночью проверяйте игроков: мафия или мирный. Дон выглядит как мафия.',
  doctor: 'Вы — доктор. Ночью лечите одного игрока. Если лечите жертву мафии — он выживает.',
};

export const ROLE_COLORS: Record<Role, string> = {
  civilian: '#a8a397',
  mafia: '#b8323d',
  don: '#cfae52',
  sheriff: '#8fa8c4',
  doctor: '#7fa88b',
};

export const ROLE_TAGLINES: Record<Role, string> = {
  civilian: 'Город',
  mafia: 'Мафия',
  don: 'Мафия',
  sheriff: 'Город',
  doctor: 'Город',
};

export const PHASE_LABELS: Record<Phase, string> = {
  lobby: 'Лобби',
  roleReveal: 'Раздача ролей',
  night: 'Ночь',
  day: 'День',
  voting: 'Голосование',
  ended: 'Конец игры',
};

export const NIGHT_SUBPHASE_LABELS: Record<string, string> = {
  mafia: 'Ход мафии',
  don: 'Ход дона',
  sheriff: 'Ход шерифа',
  doctor: 'Ход доктора',
  resolve: 'Подведение итогов',
};
