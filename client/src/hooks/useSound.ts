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
const FADE_MS = 1600;

let audio: HTMLAudioElement | null = null;
let holders = new Set<string>();
let fadeRaf = 0;
let currentGain = 0;
let targetGain = 0;
let fadeFrom = 0;
let fadeStartedAt = 0;
let unlocked = false;

function getAudio() {
  if (!audio) {
    audio = new Audio(MENU_TRACK);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
  }
  return audio;
}

function userVolume() {
  return Math.max(0, Math.min(1, useSettings.getState().musicVolume));
}

function applyOutput() {
  getAudio().volume = Math.max(0, Math.min(1, currentGain * userVolume()));
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

function fadeFrame(now: number) {
  const t = Math.min(1, (now - fadeStartedAt) / FADE_MS);
  currentGain = fadeFrom + (targetGain - fadeFrom) * easeInOut(t);
  applyOutput();

  if (t < 1) {
    fadeRaf = requestAnimationFrame(fadeFrame);
    return;
  }

  currentGain = targetGain;
  applyOutput();
  if (currentGain === 0) getAudio().pause();
}

function startFade(to: number) {
  cancelAnimationFrame(fadeRaf);
  fadeFrom = currentGain;
  targetGain = to;
  fadeStartedAt = performance.now();

  if (to > 0 && userVolume() > 0) {
    getAudio().play().catch(() => {});
  }

  fadeRaf = requestAnimationFrame(fadeFrame);
}

function tryUnlock() {
  if (unlocked) return;
  getAudio()
    .play()
    .then(() => {
      unlocked = true;
      if (currentGain === 0 && targetGain === 0) getAudio().pause();
    })
    .catch(() => {});
}

function bindUnlock() {
  const onGesture = () => tryUnlock();
  window.addEventListener('pointerdown', onGesture, { once: true });
  window.addEventListener('keydown', onGesture, { once: true });
}

bindUnlock();
useSettings.subscribe(() => {
  applyOutput();
  if (targetGain > 0 && userVolume() > 0 && getAudio().paused) {
    getAudio().play().catch(() => {});
  }
  if (userVolume() === 0) getAudio().pause();
});

let fadeOutTimer = 0;

function acquireMenuMusic(id: string) {
  holders.add(id);
  window.clearTimeout(fadeOutTimer);
  tryUnlock();
  startFade(1);
}

function releaseMenuMusic(id: string) {
  holders.delete(id);
  window.clearTimeout(fadeOutTimer);
  fadeOutTimer = window.setTimeout(() => {
    if (holders.size === 0) startFade(0);
  }, 80);
}

/** Включает трек меню с плавным появлением. На размонтировании — плавное затухание. */
export function useMenuMusic(id: string, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    acquireMenuMusic(id);
    return () => releaseMenuMusic(id);
  }, [id, enabled]);
}
