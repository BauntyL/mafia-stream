import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { RoomState } from '../types';

export function useNightKillCutscene(room: RoomState | null) {
  const [open, setOpen] = useState(false);
  const seen = useRef('');

  useEffect(() => {
    if (!room || room.phase !== 'day' || !room.lastNightResult?.killedId) return;
    const key = `${room.code}-${room.dayNumber}-${room.lastNightResult.killedId}`;
    if (seen.current === key) return;
    seen.current = key;
    setOpen(true);
  }, [room?.code, room?.phase, room?.dayNumber, room?.lastNightResult?.killedId]);

  const close = useCallback(() => setOpen(false), []);

  return {
    open,
    victim: room?.lastNightResult?.killedName ?? '',
    close,
  };
}

interface NightKillCutsceneProps {
  open: boolean;
  victim: string;
  onDone: () => void;
  cinematic?: boolean;
}

export function NightKillCutscene({ open, victim, onDone, cinematic = false }: NightKillCutsceneProps) {
  const [stage, setStage] = useState<'video' | 'title'>('video');

  useEffect(() => {
    if (open) setStage('video');
  }, [open]);

  useEffect(() => {
    if (!open || stage !== 'title') return;
    const t = window.setTimeout(onDone, cinematic ? 2800 : 2200);
    return () => window.clearTimeout(t);
  }, [open, stage, cinematic, onDone]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
        >
          {stage === 'video' && (
            <video
              key="night-kill"
              src="/cutscenes/night-kill.mp4"
              className="h-full w-full object-cover"
              autoPlay
              muted
              playsInline
              onEnded={() => setStage('title')}
            />
          )}

          {stage === 'title' && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <p
                className="font-display uppercase text-bone-50"
                style={{
                  fontSize: cinematic ? 'clamp(28px, 4.2vw, 72px)' : 'clamp(28px, 6vw, 56px)',
                  letterSpacing: '0.28em',
                  textIndent: '0.28em',
                }}
              >
                Убийство
              </p>
              <div className="mt-5 h-px w-16 bg-blood-500/70" />
              {victim && (
                <p className="mt-6 font-display text-[clamp(18px,2.4vw,32px)] text-bone-200">
                  {victim}
                </p>
              )}
              <p className="mt-3 text-[11px] uppercase tracking-[0.34em] text-blood-400/80">ночью</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
