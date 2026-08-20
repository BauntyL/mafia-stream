import { createHash } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { NARRATOR_IDS, NARRATOR_TTS, PREVIEW_TEXT } from './narrator-blocks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '.cache', 'narrator');
const FISH_API = 'https://api.fish.audio';
const PREVIEW_ID = 'preview';

const memory = new Map();
const inflight = new Map();
let voicesCache = { at: 0, items: [] };

export function fishApiKey() {
  return process.env.FISH_API_KEY || process.env.FISH_AUDIO_API_KEY || '';
}

export function fishConfigured() {
  return Boolean(fishApiKey());
}

export function sanitizeVoiceId(value) {
  const s = String(value || '').trim();
  if (!s || s === 'default' || s === 'classic') return '';
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(s)) return '';
  return s;
}

function ttsModel() {
  return process.env.FISH_TTS_MODEL || 's2.1-pro-free';
}

function hashText(text) {
  return createHash('sha1').update(text).digest('hex').slice(0, 12);
}

function cacheKey(voiceId, blockId, text) {
  return `${ttsModel()}:${voiceId}:${blockId}:${hashText(text)}`;
}

function mp3DurationMs(buf) {
  let start = 0;
  if (buf.length >= 10 && buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    const size =
      ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    start = 10 + size;
  }
  const audioBytes = Math.max(0, buf.length - start);
  return Math.max(800, Math.round((audioBytes * 8) / 128));
}

export function estimateNarratorMs(blockId) {
  const text = NARRATOR_TTS[blockId] || '';
  return Math.round([...text].length * 85 + 1200);
}

async function fishPost(pathname, { json, query } = {}) {
  const url = new URL(pathname, FISH_API);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, {
    method: json ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${fishApiKey()}`,
      ...(json ? { 'Content-Type': 'application/json', model: ttsModel() } : {}),
    },
    body: json ? JSON.stringify(json) : undefined,
  });
  return res;
}

async function synthesize(text, voiceId) {
  const res = await fishPost('/v1/tts', {
    json: {
      text,
      reference_id: voiceId,
      format: 'mp3',
      mp3_bitrate: 128,
      sample_rate: 44100,
      latency: 'normal',
      normalize: true,
      prosody: { speed: 1, volume: 0, normalize_loudness: true },
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 402) {
      throw new Error(
        'На Fish.audio закончился API-кредит. Нужен бесплатный s2.1-pro-free или пополнение на fish.audio/app/developers',
      );
    }
    throw new Error(`Fish.audio ${res.status}: ${body.slice(0, 240) || res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function readDisk(voiceId, fileBase) {
  const dir = path.join(CACHE_DIR, voiceId);
  try {
    const [buf, metaRaw] = await Promise.all([
      readFile(path.join(dir, `${fileBase}.mp3`)),
      readFile(path.join(dir, `${fileBase}.json`), 'utf8'),
    ]);
    return { buf, durationMs: JSON.parse(metaRaw).durationMs || mp3DurationMs(buf) };
  } catch {
    return null;
  }
}

async function writeDisk(voiceId, fileBase, clip) {
  const dir = path.join(CACHE_DIR, voiceId);
  await mkdir(dir, { recursive: true });
  await Promise.all([
    writeFile(path.join(dir, `${fileBase}.mp3`), clip.buf),
    writeFile(path.join(dir, `${fileBase}.json`), JSON.stringify({ durationMs: clip.durationMs })),
  ]);
}

async function getClip(voiceId, blockId, text) {
  const key = cacheKey(voiceId, blockId, text);
  const cached = memory.get(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const task = (async () => {
    const fileBase = `${ttsModel()}-${blockId}-${hashText(text)}`;
    const fromDisk = await readDisk(voiceId, fileBase);
    if (fromDisk) {
      memory.set(key, fromDisk);
      return fromDisk;
    }
    const buf = await synthesize(text, voiceId);
    const clip = { buf, durationMs: mp3DurationMs(buf) };
    memory.set(key, clip);
    writeDisk(voiceId, fileBase, clip).catch(() => undefined);
    return clip;
  })();

  inflight.set(key, task);
  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}

export async function getNarratorClip(voiceId, blockId) {
  const id = sanitizeVoiceId(voiceId);
  if (!id) throw new Error('Нужен ID голоса Fish.audio');
  if (!fishConfigured()) throw new Error('Не задан FISH_API_KEY');

  if (blockId === PREVIEW_ID) {
    return getClip(id, PREVIEW_ID, PREVIEW_TEXT);
  }

  const text = NARRATOR_TTS[blockId];
  if (!text) throw new Error('Неизвестный блок диктора');
  return getClip(id, blockId, text);
}

export async function prepareVoiceClips(voiceId) {
  const id = sanitizeVoiceId(voiceId);
  if (!id) return { durations: {} };
  const durations = {};
  const queue = [...NARRATOR_IDS];
  const limit = 3;
  let i = 0;

  async function worker() {
    while (i < queue.length) {
      const blockId = queue[i];
      i += 1;
      const clip = await getNarratorClip(id, blockId);
      durations[blockId] = clip.durationMs;
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, () => worker()));
  return { durations };
}

export async function listFishVoices(query = '') {
  if (!fishConfigured()) return { configured: false, items: [] };

  const q = String(query || '').trim();
  const now = Date.now();
  if (!q && voicesCache.items.length && now - voicesCache.at < 10 * 60 * 1000) {
    return { configured: true, items: voicesCache.items };
  }

  const params = {
    page_size: '40',
    page_number: '1',
    sort_by: q ? 'score' : 'task_count',
    language: 'ru',
  };
  if (q) params.title = q;

  const res = await fishPost('/model', { query: params });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Fish.audio ${res.status}: ${body.slice(0, 240) || res.statusText}`);
  }
  const data = await res.json();
  let items = (data.items || [])
    .filter((m) => m?.state === 'trained' && m?._id)
    .map((m) => ({
      id: m._id,
      title: m.title || m._id,
      description: m.description || '',
      languages: m.languages || [],
      cover: m.cover_image || '',
    }));

  if (items.length === 0 && q) {
    const retry = await fishPost('/model', {
      query: { page_size: '40', page_number: '1', sort_by: 'score', title: q },
    });
    if (retry.ok) {
      const extra = await retry.json();
      items = (extra.items || [])
        .filter((m) => m?.state === 'trained' && m?._id)
        .map((m) => ({
          id: m._id,
          title: m.title || m._id,
          description: m.description || '',
          languages: m.languages || [],
          cover: m.cover_image || '',
        }));
    }
  }

  if (!q) voicesCache = { at: now, items };
  return { configured: true, items };
}
