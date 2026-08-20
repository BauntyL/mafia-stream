import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../store/settings';
import {
  getNarratorDurationMs,
  getNarratorQueue,
  narratorFile,
  NARRATOR_DURATION_MS,
  type NarratorId,
} from '../utils/script';
import type { RoomState } from '../types';

let current: HTMLAudioElement | null = null;
let token = 0;

export function stopNarrator() {
  token += 1;
  if (current) {
    current.pause();
    current.removeAttribute('src');
    current.load();
    current = null;
  }
}

export function playNarratorQueue(ids: NarratorId[], volume: number, offsetMs = 0) {
  stopNarrator();
  if (ids.length === 0 || volume <= 0) return;

  let skipMs = Math.max(0, offsetMs);
  let i = 0;
  while (i < ids.length) {
    const dur = NARRATOR_DURATION_MS[ids[i]] || 0;
    if (skipMs < dur) break;
    skipMs -= dur;
    i += 1;
  }
  if (i >= ids.length) return;

  const run = token;

  const next = (seekMs: number) => {
    if (run !== token || i >= ids.length) return;
    const id = ids[i];
    i += 1;

    const audio = new Audio(narratorFile(id));
    audio.preload = 'auto';
    audio.volume = Math.max(0, Math.min(1, volume));
    current = audio;

    let done = false;
    const advance = () => {
      if (done || run !== token) return;
      done = true;
      next(0);
    };

    audio.addEventListener('ended', advance);
    audio.addEventListener('error', advance);

    const start = () => {
      if (run !== token || done) return;
      if (seekMs > 0 && Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = Math.min(seekMs / 1000, Math.max(0, audio.duration - 0.05));
      }
      audio.play().catch(advance);
    };

    audio.addEventListener('loadedmetadata', start, { once: true });
    audio.load();
  };

  next(skipMs);
}

export function narratorLeftMs(endsAt?: number | null) {
  return Math.max(0, (endsAt || 0) - Date.now());
}

/** Сколько осталось текущей озвучки — тикает, пока диктор говорит. */
export function useNarratorLeft(endsAt?: number | null) {
  const [left, setLeft] = useState(() => narratorLeftMs(endsAt));

  useEffect(() => {
    const tick = () => setLeft(narratorLeftMs(endsAt));
    tick();
    if (!endsAt || endsAt <= Date.now()) return;
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return left;
}

/** Играет озвучку диктора, когда на экране открывается новый блок сценария. */
export function useNarrator(room: RoomState | null) {
  const volume = useSettings((s) => s.sfxVolume);
  const key = room ? getNarratorQueue(room).join('|') : '';
  const endsAt = room?.narratorEndsAt || 0;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    if (current) current.volume = Math.max(0, Math.min(1, volume));
  }, [volume]);

  useEffect(() => {
    if (!key || room?.settings?.narratorEnabled === false) {
      stopNarrator();
      return;
    }
    const ids = key.split('|') as NarratorId[];
    const remaining = narratorLeftMs(endsAt);
    if (endsAt && remaining <= 250) return;

    const total = getNarratorDurationMs(ids);
    const offset = endsAt ? Math.max(0, total - remaining) : 0;
    playNarratorQueue(ids, volumeRef.current, offset);
    return () => stopNarrator();
  }, [key, endsAt, room?.settings?.narratorEnabled]);
}
