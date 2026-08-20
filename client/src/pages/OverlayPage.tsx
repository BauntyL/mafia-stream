import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOverlaySocket } from '../hooks/useSocket';
import { useCameraViewer } from '../hooks/useCameraViewer';
import { useNarrator } from '../hooks/useNarrator';
import { avatarUrl } from '../utils/avatar';
import type { Player, Role, RoomState } from '../types';
import { ROLE_LABELS, ROLE_COLORS } from '../types';
import { IconTrophy, Ornament, ROLE_EMBLEMS } from '../components/Icons';
import { NightKillCutscene, useNightKillCutscene } from '../components/NightKillCutscene';
import { useCountdown, formatTime } from '../components/Timer';

const DEATH_TITLE: Record<string, string> = {
  killed: 'УБИЙСТВО',
  voted: 'ИЗГНАНИЕ',
};

const DEATH_WHEN: Record<string, string> = {
  night: 'НОЧЬЮ',
  day: 'ДНЁМ',
};

function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    const play = () => el.play().catch(() => undefined);
    play();
    el.addEventListener('loadeddata', play);
    return () => el.removeEventListener('loadeddata', play);
  }, [stream]);

  return (
    <video
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      autoPlay
      muted
      playsInline
      disablePictureInPicture
    />
  );
}

function Slot({
  player,
  votes,
  speaking,
  stream,
}: {
  player: Player;
  votes: number;
  speaking: boolean;
  stream: MediaStream | null;
}) {
  const dead = !player.alive;
  const showVideo = !dead && !!stream;
  const role = player.role as Role | undefined;
  const Emblem = role ? ROLE_EMBLEMS[role] : null;

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
          : speaking
            ? 'inset 0 0 0 2px rgba(207,174,82,0.75), 0 14px 34px -18px rgba(0,0,0,1)'
            : 'inset 0 0 0 1px rgba(244,241,234,0.16), 0 14px 34px -18px rgba(0,0,0,1)',
      }}
    >
      {/* Портрет под видео: если камера ещё не дошла, зритель видит заглушку */}
      <img
        src={avatarUrl(player.slot)}
        alt=""
        className={`absolute inset-0 h-full w-full object-cover ${dead ? 'grayscale' : ''}`}
        draggable={false}
      />

      {showVideo && stream && <RemoteVideo stream={stream} />}

      <AnimatePresence>
        {dead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center"
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
              {role && Emblem && (
                <p
                  className="mt-3 flex items-center justify-center gap-1.5 text-[clamp(8px,0.8vw,11px)] uppercase tracking-[0.2em]"
                  style={{ color: ROLE_COLORS[role] }}
                >
                  <Emblem size={12} strokeWidth={1.5} />
                  {ROLE_LABELS[role]}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Голоса на дневном голосовании */}
      <AnimatePresence>
        {votes > 0 && !dead && (
          <motion.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            className="absolute right-2 top-2 z-10 flex h-[clamp(20px,2vw,30px)] min-w-[clamp(20px,2vw,30px)]
              items-center justify-center rounded-full px-1.5 font-mono text-[clamp(10px,1vw,14px)] tnum text-bone-50"
            style={{
              background: 'rgba(184,50,61,0.9)',
              boxShadow: '0 6px 18px -6px rgba(0,0,0,0.9)',
            }}
          >
            {votes}
          </motion.span>
        )}
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 z-10">
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
          {speaking && !dead && (
            <span className="ml-auto text-[clamp(8px,0.75vw,10px)] uppercase tracking-[0.2em] text-brass-300">
              говорит
            </span>
          )}
        </div>
      </div>

      {!player.connected && !dead && (
        <span className="absolute right-2.5 top-2.5 z-10 h-1.5 w-1.5 rounded-full bg-brass-400 shadow-lg" />
      )}
    </motion.div>
  );
}

function StatusBar({ room }: { room: RoomState }) {
  const { left } = useCountdown(room.timer?.endsAt);
  const last = room.log[room.log.length - 1];

  return (
    <div className="flex shrink-0 items-center justify-between gap-4 pt-[1.2vh]">
      <span
        className="truncate text-bone-600"
        style={{ fontSize: 'clamp(9px,0.85vw,13px)', letterSpacing: '0.14em' }}
      >
        {last?.text || ''}
      </span>

      <span className="flex shrink-0 items-center gap-[1.4vw]">
        <span
          className="uppercase text-bone-700"
          style={{ fontSize: 'clamp(8px,0.75vw,11px)', letterSpacing: '0.28em' }}
        >
          в живых <span className="tnum text-bone-200">{room.aliveCount}</span>
        </span>
        {room.timer && (
          <span
            className={`font-mono tnum ${left <= 10 ? 'text-blood-300' : 'text-bone-200'}`}
            style={{ fontSize: 'clamp(12px,1.3vw,20px)' }}
          >
            {left > 0 ? formatTime(left) : '0:00'}
          </span>
        )}
      </span>
    </div>
  );
}

export function OverlayPage() {
  const { code } = useParams<{ code: string }>();
  const { room, socket } = useOverlaySocket(code || '');
  const nightKill = useNightKillCutscene(room);
  useNarrator(room);

  const players = (room?.players.filter((p) => !p.isHost || room.settings.showHostInOverlay) || [])
    .slice()
    .sort((a, b) => a.slot - b.slot);

  const cameraIds = players
    .filter((p) => p.hasCamera && p.alive && p.connected && !p.isBot)
    .map((p) => p.id);
  const streams = useCameraViewer(socket, cameraIds);

  const count = Math.max(players.length, 1);
  const cols = count <= 4 ? 2 : count <= 9 ? 3 : 4;
  const rows = Math.ceil(count / cols);

  const phaseLabel =
    room?.phase === 'night'
      ? `Ночь ${room.dayNumber}`
      : room?.phase === 'day'
        ? `День ${room.dayNumber}`
        : room?.phase === 'nominating'
          ? 'Выставление'
          : room?.phase === 'voting'
          ? room.revoteRound > 0
            ? 'Переголосовка'
            : 'Голосование'
          : room?.phase === 'roleReveal'
            ? 'Раздача ролей'
            : '';

  return (
    <div
      className="grain relative h-screen w-screen overflow-hidden"
      style={{ background: '#07070a' }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            room?.phase === 'night'
              ? 'radial-gradient(75% 55% at 50% 0%, rgba(91,114,144,0.16) 0%, transparent 62%)'
              : room?.phase === 'voting' || room?.phase === 'nominating'
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

        <div className="flex min-h-0 flex-1 items-center justify-center pt-[1.6vh]">
          <div
            className="grid h-full w-full"
            style={{
              gap: 'clamp(6px, 0.7vw, 14px)',
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
          >
            {players.map((player) => (
              <Slot
                key={player.id}
                player={player}
                votes={
                  room?.phase === 'nominating'
                    ? room.nominationTally?.[player.id] || 0
                    : room?.voteTally?.[player.id] || 0
                }
                speaking={room?.speaking?.playerId === player.id}
                stream={streams[player.id] || null}
              />
            ))}
          </div>
        </div>

        {room && <StatusBar room={room} />}
      </div>

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

              <ul className="mt-8 grid grid-cols-2 gap-x-[3vw] gap-y-[1vh]">
                {room.players
                  .filter((p) => !p.isHost)
                  .sort((a, b) => a.slot - b.slot)
                  .map((p) => {
                    const role = p.role as Role | undefined;
                    return (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-4"
                        style={{ fontSize: 'clamp(10px,1vw,15px)' }}
                      >
                        <span className="text-bone-400">
                          <span className="mr-2 font-mono tnum text-bone-700">
                            {String(p.slot).padStart(2, '0')}
                          </span>
                          {p.nickname}
                        </span>
                        {role && (
                          <span style={{ color: ROLE_COLORS[role] }}>{ROLE_LABELS[role]}</span>
                        )}
                      </li>
                    );
                  })}
              </ul>
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

      <NightKillCutscene
        open={nightKill.open}
        victim={nightKill.victim}
        onDone={nightKill.close}
        cinematic
      />
    </div>
  );
}
