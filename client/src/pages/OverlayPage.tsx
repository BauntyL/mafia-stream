import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOverlaySocket } from '../hooks/useSocket';
import type { Player } from '../types';
import { IconTrophy, Ornament } from '../components/Icons';

const DEATH_TITLE: Record<string, string> = {
  killed: 'УБИЙСТВО',
  voted: 'ИЗГНАНИЕ',
};

const DEATH_WHEN: Record<string, string> = {
  night: 'НОЧЬЮ',
  day: 'ДНЁМ',
};

function Slot({ player }: { player: Player }) {
  const dead = !player.alive;
  const showVideo = !dead && player.cameraViewUrl;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative overflow-hidden rounded-[6px]"
      style={{
        background: '#0e0e13',
        boxShadow: dead
          ? 'inset 0 0 0 1px rgba(184,50,61,0.28), 0 14px 34px -18px rgba(0,0,0,1)'
          : 'inset 0 0 0 1px rgba(244,241,234,0.16), 0 14px 34px -18px rgba(0,0,0,1)',
      }}
    >
      {showVideo ? (
        <iframe
          src={player.cameraViewUrl!}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay"
          title={player.nickname}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(244,241,234,0.028) 0 1px, transparent 1px 11px)',
          }}
        />
      )}

      {/* Затемнение выбывшего */}
      <AnimatePresence>
        {dead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: 'rgba(7,7,10,0.86)' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 8, letterSpacing: '0.5em' }}
              animate={{ opacity: 1, y: 0, letterSpacing: '0.22em' }}
              transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
              className="text-center"
            >
              <p className="font-display text-[clamp(15px,1.8vw,26px)] leading-none text-bone-200">
                {DEATH_TITLE[player.deathReason || 'killed']}
              </p>
              <div className="mx-auto mt-2.5 h-px w-14 bg-blood-500/60" />
              <p className="mt-2.5 text-[clamp(8px,0.85vw,11px)] tracking-[0.34em] text-blood-400/90">
                {DEATH_WHEN[player.deathPhase || 'night']}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Табличка с именем */}
      <div className="absolute inset-x-0 bottom-0">
        <div
          className="flex items-baseline gap-2 px-3 pb-2 pt-6"
          style={{
            background: 'linear-gradient(to top, rgba(7,7,10,0.95) 15%, transparent 100%)',
          }}
        >
          <span className="font-mono text-[clamp(9px,0.85vw,12px)] tnum text-bone-700">
            {String(player.slot).padStart(2, '0')}
          </span>
          <span
            className={`truncate text-[clamp(11px,1.05vw,15px)] font-medium
              ${dead ? 'text-bone-700' : 'text-bone-50'}`}
          >
            {player.nickname}
          </span>
        </div>
      </div>

      {!player.connected && !dead && (
        <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-brass-400 shadow-lg" />
      )}
    </motion.div>
  );
}

export function OverlayPage() {
  const { code } = useParams<{ code: string }>();
  const { room } = useOverlaySocket(code || '');

  const players = (room?.players.filter((p) => !p.isHost || room.settings.showHostInOverlay) || [])
    .slice()
    .sort((a, b) => a.slot - b.slot);

  const slots = Array.from({ length: 12 }, (_, i) => players[i] || null);

  const phaseLabel =
    room?.phase === 'night'
      ? `Ночь ${room.dayNumber}`
      : room?.phase === 'day'
        ? `День ${room.dayNumber}`
        : room?.phase === 'voting'
          ? 'Голосование'
          : room?.phase === 'roleReveal'
            ? 'Раздача ролей'
            : '';

  return (
    <div
      className="grain relative h-screen w-screen overflow-hidden"
      style={{ background: '#07070a' }}
    >
      {/* Атмосфера, реагирующая на фазу */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            room?.phase === 'night'
              ? 'radial-gradient(75% 55% at 50% 0%, rgba(91,114,144,0.16) 0%, transparent 62%)'
              : room?.phase === 'voting'
                ? 'radial-gradient(75% 55% at 50% 0%, rgba(184,50,61,0.18) 0%, transparent 62%)'
                : 'radial-gradient(75% 55% at 50% 0%, rgba(207,174,82,0.10) 0%, transparent 62%)',
          transition: 'background 1.6s ease',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 85% 65% at 50% 45%, transparent 40%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      <div className="relative flex h-full flex-col px-[2.2vw] py-[1.8vh]">
        {/* Шапка */}
        <header className="flex shrink-0 flex-col items-center">
          <h1
            className="font-display leading-none text-bone-50"
            style={{
              fontSize: 'clamp(22px, 3.1vw, 52px)',
              letterSpacing: '0.42em',
              textIndent: '0.42em',
              textShadow: '0 4px 40px rgba(0,0,0,0.9)',
            }}
          >
            МАФИЯ
          </h1>
          <Ornament className="mt-[0.9vh] h-[1.4vh] w-[clamp(140px,15vw,260px)] text-blood-400/70" />
          <AnimatePresence mode="wait">
            {phaseLabel && (
              <motion.p
                key={phaseLabel}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.4 }}
                className="mt-[0.8vh] uppercase text-bone-600"
                style={{ fontSize: 'clamp(9px,0.85vw,13px)', letterSpacing: '0.32em' }}
              >
                {phaseLabel}
              </motion.p>
            )}
          </AnimatePresence>
        </header>

        {/* Сетка камер */}
        <div className="flex min-h-0 flex-1 items-center justify-center pt-[1.6vh]">
          <div
            className="grid h-full w-full grid-cols-4 grid-rows-3"
            style={{ gap: 'clamp(6px, 0.7vw, 14px)' }}
          >
            {slots.map((player, i) =>
              player ? (
                <Slot key={player.id} player={player} />
              ) : (
                <div
                  key={`empty-${i}`}
                  className="flex items-center justify-center rounded-[6px]"
                  style={{
                    boxShadow: 'inset 0 0 0 1px rgba(244,241,234,0.055)',
                    background:
                      'repeating-linear-gradient(45deg, rgba(244,241,234,0.016) 0 1px, transparent 1px 11px)',
                  }}
                >
                  <span className="font-mono text-[clamp(11px,1.1vw,16px)] tnum text-bone-50/[0.07]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Финал партии */}
      <AnimatePresence>
        {room?.phase === 'ended' && room.winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0 z-20 flex items-center justify-center"
            style={{ background: 'rgba(7,7,10,0.92)' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex flex-col items-center text-center"
            >
              <IconTrophy
                size={54}
                className={room.winner === 'city' ? 'text-brass-400' : 'text-blood-400'}
                strokeWidth={0.9}
              />
              <h2
                className="mt-6 font-display leading-none text-bone-50"
                style={{ fontSize: 'clamp(28px,4vw,64px)', letterSpacing: '0.14em' }}
              >
                {room.winner === 'city' ? 'ПОБЕДА ГОРОДА' : 'ПОБЕДА МАФИИ'}
              </h2>
              <Ornament className="mt-6 h-3 w-[220px] text-bone-600" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!room && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <p
            className="animate-breathe uppercase text-bone-700"
            style={{ fontSize: 'clamp(10px,1vw,14px)', letterSpacing: '0.3em' }}
          >
            Ожидание игроков
          </p>
        </div>
      )}
    </div>
  );
}
