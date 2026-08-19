import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { NicknameModal } from '../components/NicknameModal';
import { SettingsPanel } from '../components/SettingsPanel';
import { Button, IconButton } from '../components/Button';
import { Input } from '../components/ui';
import { AuthorMark } from '../components/AuthorMark';
import { IconGear, IconSpinner, Ornament } from '../components/Icons';
import { usePlayerStore } from '../store/settings';
import { useSocket } from '../hooks/useSocket';
import { useSound, useMenuMusic } from '../hooks/useSound';

export function HomePage() {
  const navigate = useNavigate();
  const { nickname, setPlayer } = usePlayerStore();
  const { emit } = useSocket();
  const sound = useSound();
  useMenuMusic('home');

  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ready, setReady] = useState(!!nickname);

  type JoinResult = { success: boolean; error?: string; playerId?: string; room?: { code: string } };

  const handleCreate = async () => {
    if (!nickname) return;
    setLoading('create');
    setError('');
    sound.click();
    const result = await emit<JoinResult>('createRoom', { nickname });
    setLoading(null);
    if (result?.success && result.playerId && result.room) {
      setPlayer(result.playerId, result.room.code);
      navigate(`/game/${result.room.code}`);
    } else {
      sound.error();
      setError(result?.error || 'Не удалось создать лобби');
    }
  };

  const handleJoin = async () => {
    if (!nickname || !joinCode.trim()) return;
    setLoading('join');
    setError('');
    sound.click();
    const result = await emit<JoinResult>('joinRoom', { code: joinCode.trim(), nickname });
    setLoading(null);
    if (result?.success && result.playerId && result.room) {
      setPlayer(result.playerId, result.room.code);
      navigate(`/game/${result.room.code}`);
    } else {
      sound.error();
      setError(result?.error || 'Лобби не найдено');
    }
  };

  return (
    <div className="grain vignette relative min-h-screen overflow-hidden bg-ink-1000">
      {/* Атмосферный свет */}
      <div
        className="animate-drift pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 50% at 50% -10%, rgba(184,50,61,0.16) 0%, transparent 65%), radial-gradient(50% 40% at 85% 95%, rgba(207,174,82,0.07) 0%, transparent 70%)',
        }}
      />

      <NicknameModal onConfirm={() => setReady(true)} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <header className="relative z-10 flex items-center justify-end px-6 py-5">
        <IconButton label="Настройки" onClick={() => setSettingsOpen(true)}>
          <IconGear size={18} />
        </IconButton>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-160px)] max-w-[560px] flex-col items-center justify-center px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
          className="w-full text-center"
        >
          <AuthorMark variant="hero" />
          <h1
            className="mt-6 flex justify-center font-display text-[clamp(52px,12vw,86px)] leading-[0.95] text-bone-50"
            style={{ gap: '0.36em', textShadow: '0 8px 60px rgba(184,50,61,0.28)' }}
          >
            <span>М</span>
            <span>А</span>
            <span>Ф</span>
            <span>И</span>
            <span className="relative pb-9">
              Я
              <span className="absolute left-1/2 top-[1.02em] -translate-x-1/2">
                <AuthorMark variant="signature" />
              </span>
            </span>
          </h1>
          <Ornament className="mx-auto mt-8 h-3 w-[190px] text-blood-400" />
          <p className="mt-5 text-[15px] leading-relaxed text-bone-600">
            Классическая игра для стрима: камеры, ведущий
            <br className="hidden sm:block" /> и красивый экран для зрителей.
          </p>
        </motion.div>

        {ready && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="mt-11 w-full"
          >
            <div className="panel p-6">
              <div className="mb-5 flex items-baseline justify-between">
                <span className="eyebrow">Вы играете как</span>
                <span className="font-display text-[19px] text-bone-50">{nickname}</span>
              </div>

              <Button
                onClick={handleCreate}
                disabled={loading !== null}
                size="lg"
                className="w-full"
                icon={loading === 'create' ? <IconSpinner size={16} /> : undefined}
              >
                Создать лобби
              </Button>

              <div className="my-5 flex items-center gap-4">
                <span className="h-px flex-1 bg-bone-50/10" />
                <span className="text-[11px] uppercase tracking-[0.2em] text-bone-700">или</span>
                <span className="h-px flex-1 bg-bone-50/10" />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleJoin();
                }}
                className="flex gap-2"
              >
                <Input
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase().slice(0, 6));
                    setError('');
                  }}
                  placeholder="КОД ЛОББИ"
                  maxLength={6}
                  className="font-mono tracking-[0.3em] uppercase"
                  invalid={!!error && loading === null && joinCode.length > 0}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={loading !== null || !joinCode.trim()}
                  className="h-11 shrink-0 px-5"
                >
                  Войти
                </Button>
              </form>

              {error && <p className="mt-3 text-center text-[13px] text-blood-300">{error}</p>}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
