import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSound } from '../hooks/useSound';

const TWITCH_URL = 'https://www.twitch.tv/bauntyl';

interface AuthorMarkProps {
  compact?: boolean;
}

export function AuthorMark({ compact = false }: AuthorMarkProps) {
  const sound = useSound();
  const [pulse, setPulse] = useState(0);

  const openTwitch = () => {
    sound.click();
    setPulse((n) => n + 1);
    window.setTimeout(() => {
      window.open(TWITCH_URL, '_blank', 'noopener,noreferrer');
    }, 420);
  };

  const size = compact ? 32 : 42;

  return (
    <button
      type="button"
      onClick={openTwitch}
      aria-label="Baunty на Twitch"
      className="group flex items-center gap-2.5 rounded-full pr-3 text-left
        transition-colors hover:bg-bone-50/[0.05]"
    >
      <span className="relative" style={{ width: size, height: size }}>
        {pulse > 0 && (
          <motion.span
            key={pulse}
            className="pointer-events-none absolute inset-0 rounded-full border border-brass-400"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 2.15, opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          />
        )}
        <motion.span
          animate={pulse > 0 ? { scale: [1, 0.88, 1.08, 1], rotate: [0, -8, 6, 0] } : { scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative block h-full w-full overflow-hidden rounded-full
            border border-brass-500/40 shadow-[0_0_0_1px_rgba(207,174,82,0.12),0_6px_18px_-8px_rgba(0,0,0,0.8)]
            group-hover:border-brass-400/70"
        >
          <img
            src="/baunty.png"
            alt=""
            className="h-full w-full object-cover object-[center_18%]"
            draggable={false}
          />
        </motion.span>
      </span>
      <span className="leading-none">
        <span className="block font-display text-[11px] italic text-bone-700 group-hover:text-bone-500">
          by
        </span>
        <span
          className={`block font-display tracking-[0.04em] text-bone-200 group-hover:text-brass-300
            ${compact ? 'text-[14px]' : 'text-[16px]'}`}
        >
          Baunty
        </span>
      </span>
    </button>
  );
}
