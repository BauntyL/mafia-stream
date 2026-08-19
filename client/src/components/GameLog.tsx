import { motion } from 'framer-motion';
import { Panel } from './ui';
import { IconSearch } from './Icons';
import type { CheckRecord, LogEntry } from '../types';
import { CHECK_LABELS } from '../types';

const TONE: Record<string, string> = {
  neutral: 'text-bone-600',
  blood: 'text-blood-300',
  sage: 'text-sage-400',
  brass: 'text-brass-300',
  night: 'text-steel-300',
};

export function GameLog({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) return null;
  const shown = entries.slice(-14).reverse();

  return (
    <Panel title="Хроника">
      <ul className="space-y-2">
        {shown.map((e) => (
          <motion.li
            key={e.id}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-2.5 text-[12.5px] leading-snug"
          >
            <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-bone-50/25" />
            <span className={TONE[e.tone] || TONE.neutral}>{e.text}</span>
          </motion.li>
        ))}
      </ul>
    </Panel>
  );
}

export function CheckHistory({ checks }: { checks: CheckRecord[] }) {
  if (checks.length === 0) return null;

  return (
    <Panel title="Ваши проверки">
      <ul className="space-y-2">
        {checks
          .slice()
          .reverse()
          .map((c, i) => {
            const bad = c.result === 'mafia' || c.result === 'sheriff';
            return (
              <li key={`${c.night}-${c.targetId}-${i}`} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="flex min-w-0 items-center gap-2">
                  <IconSearch size={13} className="shrink-0 text-bone-700" />
                  <span className="font-mono text-[11px] tnum text-bone-700">
                    Н{c.night}
                  </span>
                  <span className="truncate text-bone-200">{c.targetName}</span>
                </span>
                <span
                  className={`shrink-0 text-[12px] ${bad ? 'text-blood-300' : 'text-sage-400'}`}
                >
                  {CHECK_LABELS[c.result]}
                </span>
              </li>
            );
          })}
      </ul>
    </Panel>
  );
}
