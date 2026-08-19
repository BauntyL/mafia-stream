import { useEffect, useState } from 'react';

export function useCountdown(endsAt: number | null | undefined) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return { left: 0, running: false };
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return { left, running: left > 0 };
}

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface TimerBarProps {
  timer: { endsAt: number; total: number; label: string } | null;
  compact?: boolean;
}

export function TimerBar({ timer, compact }: TimerBarProps) {
  const { left } = useCountdown(timer?.endsAt);
  if (!timer) return null;

  const progress = timer.total > 0 ? left / timer.total : 0;
  const urgent = left <= 10 && left > 0;
  const over = left === 0;

  return (
    <div
      className={`relative overflow-hidden rounded-[8px] border bg-ink-1000/60
        ${over ? 'border-blood-600/45' : urgent ? 'border-blood-600/35' : 'border-bone-50/10'}`}
    >
      <div
        className="absolute inset-y-0 left-0 transition-[width] duration-300 ease-linear"
        style={{
          width: `${progress * 100}%`,
          background: over
            ? 'rgba(184,50,61,0.14)'
            : urgent
              ? 'rgba(184,50,61,0.16)'
              : 'rgba(207,174,82,0.10)',
        }}
      />
      <div
        className={`relative flex items-center justify-between gap-3 px-3.5 ${compact ? 'py-1.5' : 'py-2.5'}`}
      >
        <span className="eyebrow truncate">{timer.label}</span>
        <span
          className={`font-mono tnum tabular-nums ${compact ? 'text-[14px]' : 'text-[17px]'}
            ${over ? 'text-blood-300' : urgent ? 'text-blood-300' : 'text-bone-50'}`}
        >
          {over ? 'Время вышло' : formatTime(left)}
        </span>
      </div>
    </div>
  );
}
