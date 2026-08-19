import { motion } from 'framer-motion';
import { useSettings } from '../store/settings';
import type { Role } from '../types';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_COLORS, ROLE_TAGLINES } from '../types';
import { ROLE_EMBLEMS, CardBackPattern } from './Icons';

interface RoleCardProps {
  role: Role;
  flipped?: boolean;
  onFlip?: () => void;
}

export function RoleCard({ role, flipped = true, onFlip }: RoleCardProps) {
  const { roleHidden, animationsEnabled } = useSettings();
  const revealed = flipped && !roleHidden;
  const Emblem = ROLE_EMBLEMS[role];
  const color = ROLE_COLORS[role];

  return (
    <div className="perspective mx-auto w-[268px]">
      <motion.button
        type="button"
        onClick={onFlip}
        className="relative block h-[386px] w-full preserve-3d"
        animate={{ rotateY: revealed ? 180 : 0 }}
        transition={{ duration: animationsEnabled ? 0.7 : 0, ease: [0.2, 0.85, 0.25, 1] }}
        whileHover={animationsEnabled ? { scale: 1.015 } : undefined}
      >
        {/* Рубашка */}
        <div
          className="absolute inset-0 backface-hidden overflow-hidden rounded-[12px] border border-blood-700/50"
          style={{
            background:
              'radial-gradient(120% 90% at 50% 0%, #23121a 0%, #120b10 55%, #0a0709 100%)',
            boxShadow: '0 30px 70px -30px rgba(0,0,0,1), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <CardBackPattern className="absolute inset-0 h-full w-full text-blood-400/40" />
          <div className="relative flex h-full flex-col items-center justify-center gap-4">
            <span
              className="font-display text-[64px] leading-none text-blood-400/60"
              style={{ textShadow: '0 2px 24px rgba(184,50,61,0.35)' }}
            >
              М
            </span>
            <span className="eyebrow text-bone-700">Нажмите, чтобы открыть</span>
          </div>
        </div>

        {/* Лицевая сторона */}
        <div
          className="absolute inset-0 backface-hidden overflow-hidden rounded-[12px] border"
          style={{
            transform: 'rotateY(180deg)',
            borderColor: `${color}55`,
            background: `radial-gradient(115% 80% at 50% 0%, ${color}1a 0%, #0d0d12 58%, #08080b 100%)`,
            boxShadow: `0 30px 70px -30px rgba(0,0,0,1), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px ${color}14`,
          }}
        >
          <div
            className="absolute inset-3 rounded-[7px] border"
            style={{ borderColor: `${color}22` }}
          />
          <div className="relative flex h-full flex-col items-center justify-between px-7 py-9 text-center">
            <span className="eyebrow" style={{ color: `${color}cc` }}>
              {ROLE_TAGLINES[role]}
            </span>

            <div className="flex flex-col items-center gap-5">
              <span
                className="flex h-[86px] w-[86px] items-center justify-center rounded-full border"
                style={{ borderColor: `${color}40`, background: `${color}12` }}
              >
                <Emblem size={42} style={{ color }} strokeWidth={1.2} />
              </span>
              <h3 className="font-display text-[27px] leading-none text-bone-50">
                {ROLE_LABELS[role]}
              </h3>
            </div>

            <p className="text-[13px] leading-relaxed text-bone-400">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
        </div>
      </motion.button>
    </div>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  const Emblem = ROLE_EMBLEMS[role];
  const color = ROLE_COLORS[role];
  const { roleHidden } = useSettings();

  if (roleHidden) {
    return (
      <div className="flex items-center gap-3 rounded-[8px] border border-bone-50/10 bg-ink-1000/50 px-4 py-3">
        <span className="text-sm text-bone-700">Роль скрыта</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 rounded-[8px] border px-4 py-3"
      style={{ borderColor: `${color}33`, background: `${color}0d` }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
        style={{ borderColor: `${color}44` }}
      >
        <Emblem size={19} style={{ color }} strokeWidth={1.3} />
      </span>
      <span>
        <span className="block font-display text-[17px] leading-tight text-bone-50">
          {ROLE_LABELS[role]}
        </span>
        <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: `${color}bb` }}>
          {ROLE_TAGLINES[role]}
        </span>
      </span>
    </div>
  );
}
