import { useRef } from 'react';
import { useSettings } from '../store/settings';

export function useSound() {
  const { sfxVolume } = useSettings();
  const audioCtx = useRef<AudioContext | null>(null);

  const playTone = (freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) => {
    if (sfxVolume === 0) return;
    try {
      if (!audioCtx.current) audioCtx.current = new AudioContext();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = sfxVolume * volume;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      /* ignore */
    }
  };

  return {
    click: () => playTone(880, 0.05, 'sine', 0.08),
    confirm: () => { playTone(523, 0.08, 'sine', 0.12); setTimeout(() => playTone(659, 0.1, 'sine', 0.1), 80); },
    error: () => playTone(280, 0.15, 'sine', 0.12),
    death: () => { playTone(180, 0.2, 'sine', 0.1); setTimeout(() => playTone(120, 0.25, 'sine', 0.08), 150); },
    reveal: () => { playTone(440, 0.08, 'sine', 0.1); setTimeout(() => playTone(554, 0.08, 'sine', 0.1), 80); },
    night: () => playTone(330, 0.25, 'sine', 0.06),
    day: () => playTone(523, 0.2, 'sine', 0.06),
  };
}

/** Фоновая музыка появится вместе с аудиофайлами — пока звук не воспроизводится. */
export function useBackgroundMusic(_enabled: boolean) {
  /* no-op */
}
