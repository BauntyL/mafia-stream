import { motion } from 'framer-motion';
import type { Player, Phase, Role } from '../types';
import { ROLE_LABELS, ROLE_COLORS } from '../types';
import { avatarUrl } from '../utils/avatar';

interface PlayerGridProps {
  players: Player[];
  currentPlayerId?: string;
  selectable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  showRoles?: boolean;
}

export function PlayerGrid({
  players,
  currentPlayerId,
  selectable,
  selectedId,
  onSelect,
  showRoles,
}: PlayerGridProps) {
  const gamePlayers = players.filter((p) => !p.isHost).sort((a, b) => a.slot - b.slot);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {gamePlayers.map((player) => {
        const isMe = player.id === currentPlayerId;
        const isSelected = selectedId === player.id;
        const canSelect = Boolean(selectable && player.alive);
        const role = player.role as Role | undefined;
        const Emblem = role && showRoles ? ROLE_EMBLEMS[role] : null;

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
                  : isSelected
                    ? 'border-blood-500/70 bg-blood-900/25'
                    : isMe
                      ? 'border-bone-50/20 bg-bone-50/[0.05]'
                      : canSelect
                        ? 'cursor-pointer border-bone-50/10 bg-bone-50/[0.025] hover:border-bone-50/25 hover:bg-bone-50/[0.05]'
                        : 'border-bone-50/[0.08] bg-bone-50/[0.02]'
              }`}
          >
            {/* Мёртвый: диагональная штриховка */}
            {!player.alive && (
              <span
                className="pointer-events-none absolute inset-0 opacity-[0.5]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(244,241,234,0.045) 0 1px, transparent 1px 9px)',
                }}
              />
            )}

            {isSelected && (
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
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-bone-50/10"
                  draggable={false}
                />
                <span className="font-mono text-[11px] tnum text-bone-700">
                  {String(player.slot).padStart(2, '0')}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                {player.hasCamera && player.alive && (
                  <IconCamera size={13} className="text-bone-700" strokeWidth={1.4} />
                )}
                {!player.connected && (
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

            <div className="relative mt-2 flex min-h-[18px] items-center gap-2">
              {isMe && player.alive && (
                <span className="text-[10px] uppercase tracking-[0.16em] text-bone-600">Вы</span>
              )}
              {player.isTeammate && (
                <span className="text-[10px] uppercase tracking-[0.16em] text-blood-400">Свой</span>
              )}
              {showRoles && role && Emblem && (
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
}

const PHASE_META: Record<
  string,
  { text: string; Icon: typeof IconMoon; tone: string; glow: string }
> = {
  lobby: { text: 'Лобби', Icon: IconUsers, tone: 'text-bone-400', glow: 'transparent' },
  roleReveal: { text: 'Раздача ролей', Icon: IconUsers, tone: 'text-brass-300', glow: '#cfae5218' },
  night: { text: 'Ночь', Icon: IconMoon, tone: 'text-steel-300', glow: '#8fa8c418' },
  day: { text: 'День', Icon: IconSun, tone: 'text-brass-300', glow: '#cfae5218' },
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

export function PhaseBanner({ phase, nightSubPhase, dayNumber }: PhaseBannerProps) {
  const meta = PHASE_META[phase] ?? PHASE_META.lobby;
  const { Icon } = meta;
  const showDay = phase === 'night' || phase === 'day';

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
  );
}
