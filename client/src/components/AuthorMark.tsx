import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSound } from '../hooks/useSound';

const TWITCH_URL = 'https://www.twitch.tv/bauntyl';

type AuthorMarkVariant = 'hero' | 'signature' | 'compact';

interface AuthorMarkProps {
  variant?: AuthorMarkVariant;
}

export function AuthorMark({ variant = 'signature' }: AuthorMarkProps) {
  const sound = useSound();
  const [pulse, setPulse] = useState(0);

  const openTwitch = () => {
    sound.click();
    setPulse((n) => n + 1);
    window.setTimeout(() => {
      window.open(TWITCH_URL, '_blank', 'noopener,noreferrer');
    }, 420);
  };

  const size = variant === 'hero' ? 132 : variant === 'compact' ? 32 : 0;

  return (
    <button
      type="button"
      onClick={openTwitch}
      aria-label="Baunty на Twitch"
      className={`group ${
        variant === 'hero'
          ? ''
          : variant === 'signature'
            ? 'text-center'
            : 'flex items-center gap-2.5 text-left'
      }`}
    >
      {variant !== 'signature' && (
        <span className="relative mx-auto block" style={{ width: size, height: size }}>
          {pulse > 0 && (
            <motion.span
              key={pulse}
              className="pointer-events-none absolute inset-0 rounded-full border border-brass-400"
              initial={{ scale: 1, opacity: 0.85 }}
              animate={{ scale: 1.85, opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            />
          )}
          <motion.span
            animate={pulse > 0 ? { scale: [1, 0.9, 1.06, 1] } : { scale: 1 }}
            whileHover={{ scale: 1.04 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative block h-full w-full overflow-hidden rounded-full
              border border-brass-500/45 bg-ink-900
              shadow-[0_0_0_1px_rgba(207,174,82,0.12),0_18px_40px_-16px_rgba(0,0,0,0.9)]
              group-hover:border-brass-400/80"
          >
            <img
              src="/baunty.png"
              alt=""
              className="h-full w-full object-cover object-center"
              draggable={false}
            />
          </motion.span>
        </span>
      )}

      {variant !== 'hero' && (
        <motion.span
          animate={pulse > 0 ? { opacity: [1, 0.45, 1] } : { opacity: 1 }}
          className={variant === 'signature' ? 'whitespace-nowrap leading-none' : 'leading-none'}
        >
          {variant === 'signature' ? (
            <span className="font-display text-[15px] italic tracking-[0.02em] text-bone-400 group-hover:text-brass-300">
              <span className="text-bone-700 group-hover:text-bone-500">by </span>
              Baunty
            </span>
          ) : (
            <>
              <span className="block font-display text-[11px] italic text-bone-700 group-hover:text-bone-500">
                by
              </span>
              <span className="block font-display text-[14px] tracking-[0.04em] text-bone-200 group-hover:text-brass-300">
                Baunty
              </span>
            </>
          )}
        </motion.span>
      )}
    </button>
  );
}
