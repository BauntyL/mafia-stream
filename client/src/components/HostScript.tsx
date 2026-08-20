import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Badge } from './ui';
import { IconCheck, IconChevronRight, IconSpinner, IconPlay, Ornament } from './Icons';
import { TimerBar } from './Timer';
import { getHostScript, getNarratorDurationMs, getNarratorQueue, type ScriptActionKey } from '../utils/script';
import { narratorLeftMs, playNarratorQueue, useNarratorLeft } from '../hooks/useNarrator';
import { useSettings } from '../store/settings';
import type { RoomState } from '../types';

interface HostScriptProps {
  room: RoomState;
  onAction: (key: ScriptActionKey) => void;
}

function formatLeft(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function StepStatus({ room }: { room: RoomState }) {
  const step = room.step;
  if (!step || step.total === 0) return null;

  const ready = step.ready;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[8px] border px-3.5 py-2.5
        transition-colors duration-300
        ${ready ? 'border-sage-600/40 bg-sage-600/[0.09]' : 'border-bone-50/10 bg-ink-1000/50'}`}
    >
      <span className="flex items-center gap-2">
        {ready ? (
          <IconCheck size={15} className="text-sage-400" />
        ) : (
          <IconSpinner size={15} className="text-brass-300" />
        )}
        <span className={`text-[13px] ${ready ? 'text-sage-400' : 'text-bone-200'}`}>
          {ready ? 'Все готовы' : `Готовы ${step.done} из ${step.total}`}
        </span>
      </span>

      <span className="flex items-center gap-1">
        {Array.from({ length: step.total }, (_, i) => (
          <motion.span
            key={i}
            animate={{ opacity: i < step.done ? 1 : 0.25 }}
            className={`h-1.5 w-4 rounded-full ${
              i < step.done ? (ready ? 'bg-sage-500' : 'bg-brass-400') : 'bg-bone-50/25'
            }`}
          />
        ))}
      </span>

      {!ready && step.waiting.length > 0 && (
        <span className="min-w-0 flex-1 truncate text-right text-[12px] text-bone-700">
          ждём: {step.waiting.join(', ')}
        </span>
      )}
    </div>
  );
}

export function HostScript({ room, onAction }: HostScriptProps) {
  const script = getHostScript(room);
  const voiceQueue = getNarratorQueue(room);
  const narratorLeft = useNarratorLeft(room.narratorEndsAt);
  const narratorBusy = narratorLeft > 250;
  const sfxVolume = useSettings((s) => s.sfxVolume);
  const step = room.step;
  const gated = Boolean(script.waitLabel);
  const stepReady = step ? step.ready : true;
  const canStart = script.action?.key !== 'startGame' || room.canStart;
  const actionEnabled = (!gated || stepReady) && canStart && !narratorBusy;
  const [abortArmed, setAbortArmed] = useState(false);
  const inMatch = room.phase !== 'lobby' && room.phase !== 'ended';

  return (
    <section className="panel relative overflow-hidden border-brass-500/25">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 100% at 0% 0%, rgba(207,174,82,0.10) 0%, transparent 55%)',
        }}
      />

      <header className="relative flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <span className="eyebrow text-brass-300/90">{script.eyebrow}</span>
        <div className="flex items-center gap-2">
          {script.voiceId && room.settings.narratorEnabled !== false && (
            <button
              type="button"
              onClick={() => {
                const remaining = narratorLeftMs(room.narratorEndsAt);
                const voiceId = room.settings.narratorVoiceId || '';
                const clipMs = room.narratorClipMs;
                const total = getNarratorDurationMs(voiceQueue, voiceId, clipMs);
                const offset = remaining > 250 ? Math.max(0, total - remaining) : 0;
                playNarratorQueue(voiceQueue, sfxVolume, offset, { voiceId, clipMs });
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-brass-500/30
                bg-brass-500/10 px-2.5 py-[3px] text-[11px] font-medium tracking-[0.04em] text-brass-300
                transition-colors hover:bg-brass-500/20"
              title="Повторить озвучку"
            >
              <IconPlay size={11} />
              Повторить
            </button>
          )}
          <Badge tone="brass">Сценарий ведущего</Badge>
        </div>
      </header>
      <div className="rule" />

      <div className="relative px-5 pt-5 pb-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={script.id + room.dayNumber}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <h3 className="font-display text-[26px] leading-tight text-bone-50">
              {script.title}
            </h3>
            <Ornament className="mt-3 h-2.5 w-[120px] text-brass-400/50" />

            <div className="mt-5 border-l-2 border-blood-600/45 pl-4">
              <ul className="space-y-3">
                {script.lines.map((line) => (
                  <motion.li
                    key={line}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-display text-[18px] leading-[1.45] text-bone-100"
                  >
                    {line}
                  </motion.li>
                ))}
              </ul>
            </div>

            {script.liveLines && script.liveLines.length > 0 && (
              <ul className="mt-4 space-y-1.5 rounded-[8px] border border-bone-50/10 bg-ink-1000/40 px-3.5 py-3">
                {script.liveLines.map((line) => (
                  <li key={line} className="text-[13.5px] leading-relaxed text-brass-200">
                    {line}
                  </li>
                ))}
              </ul>
            )}

            {script.note && (
              <p className="mt-4 text-[12.5px] leading-relaxed text-bone-700">{script.note}</p>
            )}
          </motion.div>
        </AnimatePresence>

        {room.timer && (
          <div className="mt-5">
            <TimerBar timer={room.timer} />
          </div>
        )}

        <div className="mt-5 space-y-3">
          <StepStatus room={room} />

          <div className="flex flex-wrap gap-2.5">
            {script.action && (
              <Button
                onClick={() => onAction(script.action!.key)}
                variant={actionEnabled ? script.action.tone : 'secondary'}
                disabled={!canStart || narratorBusy}
                className="min-w-[210px] flex-1"
                iconRight={<IconChevronRight size={16} />}
                title={
                  narratorBusy
                    ? 'Дождитесь, пока диктор закончит'
                    : actionEnabled
                      ? undefined
                      : script.waitLabel || 'Дождитесь готовности игроков'
                }
              >
                {script.action.label}
              </Button>
            )}
            {script.extra && (
              <Button
                onClick={() => onAction(script.extra!.key)}
                variant="secondary"
                className="flex-1"
              >
                {script.extra.label}
              </Button>
            )}
            {narratorBusy && room.settings.narratorEnabled !== false && (
              <Button
                onClick={() => onAction('skipNarrator')}
                variant="ghost"
                className="flex-1"
              >
                Пропустить диктора
              </Button>
            )}
            {inMatch && (
              <Button
                variant={abortArmed ? 'danger' : 'ghost'}
                className="flex-1"
                onClick={() => {
                  if (!abortArmed) {
                    setAbortArmed(true);
                    window.setTimeout(() => setAbortArmed(false), 3500);
                    return;
                  }
                  setAbortArmed(false);
                  onAction('abortGame');
                }}
              >
                {abortArmed ? 'Точно завершить?' : 'Завершить игру'}
              </Button>
            )}
          </div>

          {narratorBusy && (
            <p className="text-[12.5px] text-brass-300/90">
              Диктор говорит — {formatLeft(narratorLeft)}. Можно пропустить и идти дальше.
            </p>
          )}

          {!actionEnabled && !narratorBusy && script.waitLabel && (
            <p className="text-[12.5px] text-brass-300/90">
              {script.waitLabel}. Если игрок не отвечает, можно перейти дальше принудительно.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
