import { useEffect, useRef } from 'react';
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

const MENU_TRACK = '/audio/smoke-and-velvet.mp3';

/** Фоновая музыка только для меню. На страницах игры и OBS не вызывать. */
export function useMenuMusic() {
  const { musicVolume } = useSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(MENU_TRACK);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = Math.max(0, Math.min(1, musicVolume));
    audioRef.current = audio;

    const tryPlay = () => {
      if (!audioRef.current || audioRef.current.volume === 0) return;
      audioRef.current.play().catch(() => {
        /* браузер ждёт жест пользователя */
      });
    };

    tryPlay();
    const onGesture = () => tryPlay();
    window.addEventListener('pointerdown', onGesture, { once: true });
    window.addEventListener('keydown', onGesture, { once: true });

    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, musicVolume));
    if (musicVolume === 0) {
      audio.pause();
    } else if (audio.paused) {
      audio.play().catch(() => {});
    }
  }, [musicVolume]);
}
