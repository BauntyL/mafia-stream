import { motion } from 'framer-motion';
import type { Player, Phase, Role } from '../types';
import { ROLE_LABELS, ROLE_COLORS } from '../types';
import {
  ROLE_EMBLEMS,
  IconCamera,
  IconMoon,
  IconSun,
  IconGavel,
  IconTrophy,
  IconUsers,
  IconCheck,
  IconMic,
  IconRobot,
} from './Icons';
import { avatarUrl } from '../utils/avatar';

interface PlayerGridProps {
  players: Player[];
  currentPlayerId?: string;
  selectable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Подтверждённый и уже неизменяемый выбор игрока */
  lockedTargetId?: string | null;
  /** Живой подсчёт голосов на дневном голосовании */
  tally?: Record<string, number>;
  /** Кого вообще можно выбрать (например, при переголосовке) */
  candidateIds?: string[] | null;
  /** Подписи под именем: id игрока → текст */
  annotations?: Record<string, string>;
  speakingId?: string | null;
}

export function PlayerGrid({
  players,
  currentPlayerId,
  selectable,
  selectedId,
  onSelect,
  lockedTargetId,
  tally,
  candidateIds,
  annotations,
  speakingId,
}: PlayerGridProps) {
  const gamePlayers = players.filter((p) => !p.isHost).sort((a, b) => a.slot - b.slot);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {gamePlayers.map((player) => {
        const isMe = player.id === currentPlayerId;
        const isCandidate = !candidateIds || candidateIds.includes(player.id);
        const isSelected = selectedId === player.id;
        const isLocked = lockedTargetId === player.id;
        const canSelect = Boolean(selectable && player.alive && isCandidate && !lockedTargetId);
        const role = player.role as Role | undefined;
        // Сервер сам решает, кому какую роль показывать — если она пришла, её можно рисовать
        const Emblem = role ? ROLE_EMBLEMS[role] : null;
        const votes = tally?.[player.id] || 0;
        const speaking = speakingId === player.id;
        const note = annotations?.[player.id];

        return (
          <motion.button
            key={player.id}
            type="button"
            layout
            disabled={!canSelect}
            onClick={() => canSelect && onSelect?.(player.id)}
            whileHover={canSelect ? { y: -2 } : undefined}
            whileTap={canSelect ? { scale: 0.985 } : undefined}
            transition={{ duration: 0.18 }}
            className={`group relative overflow-hidden rounded-[9px] border px-3.5 py-3 text-left
              transition-colors duration-200
              ${
                !player.alive
                  ? 'border-bone-50/[0.06] bg-ink-1000/70'
                  : isLocked
                    ? 'border-brass-500/60 bg-brass-500/[0.10]'
                    : isSelected
                      ? 'border-blood-500/70 bg-blood-900/25'
                      : speaking
                        ? 'border-brass-400/50 bg-brass-500/[0.07]'
                        : isMe
                          ? 'border-bone-50/20 bg-bone-50/[0.05]'
                          : canSelect
                            ? 'cursor-pointer border-bone-50/10 bg-bone-50/[0.025] hover:border-bone-50/25 hover:bg-bone-50/[0.05]'
                            : 'border-bone-50/[0.08] bg-bone-50/[0.02]'
              }
              ${selectable && !isCandidate && player.alive ? 'opacity-40' : ''}`}
          >
            {!player.alive && (
              <span
                className="pointer-events-none absolute inset-0 opacity-[0.5]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(244,241,234,0.045) 0 1px, transparent 1px 9px)',
                }}
              />
            )}

            {isSelected && !isLocked && (
              <motion.span
                layoutId="target-marker"
                className="absolute inset-0 rounded-[9px] ring-1 ring-inset ring-blood-400/50"
              />
            )}

            <div className="relative flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <img
                  src={avatarUrl(player.slot)}
                  alt=""
                  className={`h-7 w-7 rounded-full object-cover ring-1 ring-bone-50/10
                    ${player.alive ? '' : 'grayscale'}`}
                  draggable={false}
                />
                <span className="font-mono text-[11px] tnum text-bone-700">
                  {String(player.slot).padStart(2, '0')}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                {votes > 0 && (
                  <span
                    className="rounded-full border border-blood-600/45 bg-blood-900/40 px-1.5
                      text-[11px] font-medium tnum text-blood-200"
                  >
                    {votes}
                  </span>
                )}
                {speaking && <IconMic size={13} className="text-brass-300" strokeWidth={1.5} />}
                {isLocked && <IconCheck size={13} className="text-brass-300" strokeWidth={2} />}
                {player.isBot && (
                  <IconRobot size={13} className="text-bone-700" strokeWidth={1.4} />
                )}
                {player.hasCamera && player.alive && (
                  <IconCamera size={13} className="text-bone-700" strokeWidth={1.4} />
                )}
                {!player.connected && !player.isBot && (
                  <span className="h-1.5 w-1.5 rounded-full bg-brass-500/80" title="Оффлайн" />
                )}
              </span>
            </div>

            <p
              className={`relative mt-1.5 truncate text-[15px] font-medium
                ${player.alive ? 'text-bone-50' : 'text-bone-700 line-through decoration-blood-700/60'}`}
            >
              {player.nickname}
            </p>

            <div className="relative mt-2 flex min-h-[18px] flex-wrap items-center gap-x-2 gap-y-1">
              {isMe && player.alive && (
                <span className="text-[10px] uppercase tracking-[0.16em] text-bone-600">Вы</span>
              )}
              {player.isTeammate && (
                <span className="text-[10px] uppercase tracking-[0.16em] text-blood-400">Свой</span>
              )}
              {Emblem && role && (
                <span className="flex items-center gap-1.5">
                  <Emblem size={13} style={{ color: ROLE_COLORS[role] }} strokeWidth={1.4} />
                  <span className="text-[11px]" style={{ color: `${ROLE_COLORS[role]}cc` }}>
                    {ROLE_LABELS[role]}
                  </span>
                </span>
              )}
              {!player.alive && (
                <span className="text-[10px] uppercase tracking-[0.16em] text-blood-400/80">
                  {player.deathReason === 'killed' ? 'Убит ночью' : 'Изгнан днём'}
                </span>
              )}
              {note && (
                <span className="text-[10px] uppercase tracking-[0.14em] text-brass-300/85">
                  {note}
                </span>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

interface PhaseBannerProps {
  phase: Phase;
  nightSubPhase?: string | null;
  dayNumber?: number;
  aliveCount?: number;
}

const PHASE_META: Record<
  string,
  { text: string; Icon: typeof IconMoon; tone: string; glow: string }
> = {
  lobby: { text: 'Лобби', Icon: IconUsers, tone: 'text-bone-400', glow: 'transparent' },
  roleReveal: { text: 'Раздача ролей', Icon: IconUsers, tone: 'text-brass-300', glow: '#cfae5218' },
  night: { text: 'Ночь', Icon: IconMoon, tone: 'text-steel-300', glow: '#8fa8c418' },
  day: { text: 'День', Icon: IconSun, tone: 'text-brass-300', glow: '#cfae5218' },
  nominating: { text: 'Выставление', Icon: IconGavel, tone: 'text-brass-300', glow: '#cfae5220' },
  voting: { text: 'Голосование', Icon: IconGavel, tone: 'text-blood-300', glow: '#b8323d20' },
  ended: { text: 'Игра окончена', Icon: IconTrophy, tone: 'text-brass-300', glow: '#cfae5220' },
};

const SUB_LABELS: Record<string, string> = {
  mafia: 'Ход мафии',
  don: 'Ход дона',
  sheriff: 'Ход шерифа',
  doctor: 'Ход доктора',
  resolve: 'Итоги ночи',
};

export function PhaseBanner({ phase, nightSubPhase, dayNumber, aliveCount }: PhaseBannerProps) {
  const meta = PHASE_META[phase] ?? PHASE_META.lobby;
  const { Icon } = meta;
  const showDay = phase === 'night' || phase === 'day' || phase === 'nominating' || phase === 'voting';

  return (
    <div
      className="relative overflow-hidden rounded-[10px] border border-bone-50/10"
      style={{ background: `radial-gradient(90% 140% at 50% 0%, ${meta.glow} 0%, transparent 70%)` }}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3.5">
          <span className={`${meta.tone}`}>
            <Icon size={22} strokeWidth={1.3} />
          </span>
          <div>
            <motion.h2
              key={`${phase}-${dayNumber}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="font-display text-[21px] leading-none text-bone-50"
            >
              {meta.text}
              {showDay && dayNumber ? (
                <span className="ml-2 text-bone-600 tnum">{dayNumber}</span>
              ) : null}
            </motion.h2>
            {nightSubPhase && phase === 'night' && (
              <motion.p
                key={nightSubPhase}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-1 text-[12px] tracking-[0.1em] text-bone-600 uppercase"
              >
                {SUB_LABELS[nightSubPhase]}
              </motion.p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {typeof aliveCount === 'number' && phase !== 'lobby' && (
            <span className="hidden text-[12px] text-bone-600 sm:block">
              в живых <span className="tnum text-bone-200">{aliveCount}</span>
            </span>
          )}
          {phase === 'night' && (
            <div className="hidden items-center gap-1.5 sm:flex">
              {['mafia', 'don', 'sheriff', 'doctor'].map((step) => (
                <span
                  key={step}
                  className={`h-[3px] w-7 rounded-full transition-colors duration-300
                    ${nightSubPhase === step ? 'bg-steel-300' : 'bg-bone-50/12'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
