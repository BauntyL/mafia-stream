import { useEffect, useRef, useState } from 'react';
import { IconPlay, IconSpinner } from './Icons';
import type { RoomState } from '../types';

const VOICES = [
  { id: '', title: 'Классическая запись' },
  { id: '0a690dbeb3984a9f88cd39353880775f', title: 'Меллстрой' },
  { id: 'cc1b79b1108f4ed3b8aac118ba6ebd07', title: 'Мориарти' },
  { id: 'd3102118e59642e3a78b1ab24af17f26', title: 'Мабой' },
] as const;

interface NarratorVoicePickerProps {
  room: RoomState;
  onUpdateSettings: (settings: Partial<RoomState['settings']>) => void;
}

export function NarratorVoicePicker({ room, onUpdateSettings }: NarratorVoicePickerProps) {
  const selectedId = room.settings.narratorVoiceId || '';
  const preparing = Boolean(room.narratorVoicePreparing);
  const error = room.narratorVoiceError || '';

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('/api/narrator/status')
      .then((r) => r.json())
      .then((d) => setConfigured(Boolean(d.configured)))
      .catch(() => setConfigured(false));
  }, []);

  useEffect(
    () => () => {
      previewRef.current?.pause();
      previewRef.current = null;
    },
    [],
  );

  const applyVoice = (id: string, title: string) => {
    previewRef.current?.pause();
    setPreviewing(false);
    onUpdateSettings({ narratorVoiceId: id, narratorVoiceTitle: title });
  };

  const playPreview = (id: string) => {
    previewRef.current?.pause();
    const audio = new Audio(`/api/narrator/${encodeURIComponent(id)}/preview.mp3`);
    previewRef.current = audio;
    setPreviewing(true);
    audio.addEventListener('ended', () => setPreviewing(false), { once: true });
    audio.addEventListener('error', () => setPreviewing(false), { once: true });
    audio.play().catch(() => setPreviewing(false));
  };

  return (
    <div className="space-y-3">
      <div>
        <span className="block text-sm text-bone-200">Голос диктора</span>
        <span className="mt-0.5 block text-xs text-bone-700">
          Классическая запись — файлы в игре. Остальные читает Fish.audio.
        </span>
      </div>

      <ul className="space-y-1.5">
        {VOICES.map((voice) => {
          const selected = selectedId === voice.id;
          const needsApi = Boolean(voice.id);
          const locked = needsApi && configured === false;
          return (
            <li key={voice.id || 'classic'}>
              <div
                className={`flex items-center gap-1 rounded-[7px] border px-2 py-1.5 transition-colors
                  ${
                    selected
                      ? 'border-brass-500/40 bg-brass-500/10'
                      : 'border-bone-50/10 hover:border-bone-50/20'
                  }
                  ${locked ? 'opacity-40' : ''}`}
              >
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => applyVoice(voice.id, voice.title)}
                  className={`min-w-0 flex-1 truncate text-left text-[13px]
                    ${selected ? 'text-brass-200' : 'text-bone-200'}`}
                >
                  {voice.title}
                </button>
                {voice.id ? (
                  <button
                    type="button"
                    disabled={locked}
                    aria-label={`Прослушать: ${voice.title}`}
                    onClick={() => playPreview(voice.id)}
                    className="rounded p-1 text-bone-600 hover:text-brass-300 disabled:hover:text-bone-600"
                  >
                    <IconPlay size={12} />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {preparing && (
        <p className="flex items-center gap-2 text-[12px] text-bone-600">
          <IconSpinner size={14} />
          Готовим озвучку {room.settings.narratorVoiceTitle || ''}
        </p>
      )}
      {previewing && <p className="text-[11px] text-bone-700">Играет пробная фраза…</p>}
      {error ? <p className="text-[12px] text-blood-300">{error}</p> : null}
      {configured === false && (
        <p className="text-[12px] leading-relaxed text-bone-700">
          Для Меллстроя, Мориарти и Мабоя на сервере нужен ключ{' '}
          <span className="text-bone-500">FISH_API_KEY</span>.
        </p>
      )}
    </div>
  );
}
