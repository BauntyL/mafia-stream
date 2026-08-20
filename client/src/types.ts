export type Role = 'civilian' | 'mafia' | 'don' | 'sheriff' | 'doctor';

export type Phase = 'lobby' | 'roleReveal' | 'night' | 'day' | 'nominating' | 'voting' | 'ended';

export type NightSubPhase = 'mafia' | 'don' | 'sheriff' | 'doctor' | 'resolve' | null;

export type ChatChannel = 'all' | 'mafia' | 'dead' | 'system';

export interface Player {
  id: string;
  nickname: string;
  slot: number;
  isHost: boolean;
  isCreator: boolean;
  isBot: boolean;
  alive: boolean;
  deathReason: 'killed' | 'voted' | null;
  deathPhase: 'night' | 'day' | null;
  deathDay: number | null;
  connected: boolean;
  ready: boolean;
  roleSeen: boolean;
  hasCamera: boolean;
  role?: Role;
  isTeammate?: boolean;
}

export interface ChatMessage {
  id: string;
  at: number;
  channel: ChatChannel;
  text: string;
  system: boolean;
  authorId: string | null;
  authorName: string | null;
  authorSlot: number | null;
  isHost?: boolean;
}

export interface LogEntry {
  id: string;
  at: number;
  day: number;
  text: string;
  tone: 'neutral' | 'blood' | 'sage' | 'brass' | 'night';
}

export interface CheckRecord {
  night: number;
  targetId: string;
  targetName: string;
  targetSlot: number;
  result: 'mafia' | 'civilian' | 'sheriff' | 'not_sheriff';
}

export interface GameSettings {
  includeDoctor: boolean;
  discussionTime: number;
  speechTime: number;
  showHostInOverlay: boolean;
  revealRoleOnDeath: boolean;
  autoAdvanceNight: boolean;
  chatEnabled: boolean;
  narratorEnabled: boolean;
  peacefulFirstNight: boolean;
  requireNominations: boolean;
}

export interface RoomState {
  code: string;
  phase: Phase;
  nightSubPhase: NightSubPhase;
  dayNumber: number;
  hostId: string;
  players: Player[];
  settings: GameSettings;
  lastNightResult: {
    peaceful: boolean;
    saved: boolean;
    killedId: string | null;
    killedName: string | null;
    killedSlot: number | null;
    killedRole: Role | null;
  } | null;
  lastVoteResult: {
    exiledId: string | null;
    exiledName: string | null;
    exiledRole: Role | null;
    tie: boolean;
    revote: boolean;
    voteCounts: Record<string, number>;
    breakdown: {
      voterId: string;
      voterName: string;
      targetId: string | null;
      targetName: string | null;
    }[];
  } | null;
  winner: 'city' | 'mafia' | null;
  hostVotes: Record<string, string>;
  playerCount: number;
  gamePlayerCount: number;
  aliveCount: number;
  minPlayers: number;
  maxPlayers: number;
  canStart: boolean;
  timer: { endsAt: number; total: number; label: string } | null;
  speaking: { playerId: string; nickname: string; slot: number } | null;
  log: LogEntry[];
  chat: ChatMessage[];
  voteCandidateIds: string[] | null;
  nominatedIds?: string[];
  nominatedCount?: number;
  nominationTally?: Record<string, number>;
  nominationSkipped?: number;
  revoteRound: number;
  gameNumber: number;
  stepReady: boolean;
  /** Серверное время, когда должна закончиться текущая озвучка */
  narratorEndsAt?: number;

  voteTally?: Record<string, number>;
  voteAbstained?: number;
  votedCount?: number;
  voterCount?: number;
  publicVotes?: Record<string, string | null>;

  /** Только для ведущего */
  step?: { total: number; done: number; waiting: string[]; ready: boolean };
  mafiaVotes?: Record<string, string | null>;
  nightPicks?: {
    mafia: Record<string, string>;
    don: string | null;
    sheriff: string | null;
    doctor: string | null;
  };

  /** Только для самого игрока */
  you?: {
    id: string;
    alive: boolean;
    canAct: boolean;
    actionLocked: boolean;
    actionTargetId: string | null;
    actionSkipped: boolean;
    voteLocked: boolean;
    voteTargetId: string | null;
    voteSkipped: boolean;
    nominationLocked?: boolean;
    nominationTargetId?: string | null;
    nominationSkipped?: boolean;
    checks: CheckRecord[];
    selfHealUsed: boolean;
    canSelfHeal: boolean;
    blockedHealId: string | null;
  };
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
  nominating: 'Выставление',
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

export const CHECK_LABELS: Record<string, string> = {
  mafia: 'мафия',
  civilian: 'мирный',
  sheriff: 'шериф',
  not_sheriff: 'не шериф',
};

export interface LobbyPerson {
  nickname: string;
  where: 'hall' | 'table';
}

export interface LobbyChatMessage {
  id: string;
  at: number;
  authorName: string;
  text: string;
}

export interface LobbyState {
  online: LobbyPerson[];
  count: number;
  chat: LobbyChatMessage[];
}
