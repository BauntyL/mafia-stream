import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerGrid, PhaseBanner } from '../components/PlayerGrid';
import { RoleCard, RoleBadge } from '../components/RoleCard';
import { CameraSetup } from '../components/CameraSetup';
import { HostPanel } from '../components/HostPanel';
import { SettingsPanel } from '../components/SettingsPanel';
import { AuthorMark } from '../components/AuthorMark';
import { Button, IconButton } from '../components/Button';
import { Panel, Badge, CopyRow } from '../components/ui';
import {
  IconGear,
  IconArrowLeft,
  IconCheck,
  IconCopy,
  IconCamera,
  IconCameraOff,
  IconMic,
  IconSearch,
  IconSpinner,
  IconTrophy,
  IconPlay,
  IconMonitor,
} from '../components/Icons';
import { usePlayerStore } from '../store/settings';
import { useSocket } from '../hooks/useSocket';
import { useSound } from '../hooks/useSound';
import type { Role } from '../types';
import { ROLE_LABELS } from '../types';

function getHint(
  phase: string,
  nightSubPhase: string | null,
  role: Role | undefined,
  isHost: boolean,
): string {
  if (isHost) return 'Ведите игру: объявляйте фазы и следите за столом';
  if (!role) return 'Ожидайте начала игры';
  if (phase === 'roleReveal') return 'Откройте карту и запомните свою роль';
  if (phase === 'night') {
    if (nightSubPhase === 'mafia' && (role === 'mafia' || role === 'don'))
      return 'Выберите жертву этой ночи';
    if (nightSubPhase === 'don' && role === 'don') return 'Проверьте игрока — шериф ли он';
    if (nightSubPhase === 'sheriff' && role === 'sheriff') return 'Проверьте игрока — мафия ли он';
    if (nightSubPhase === 'doctor' && role === 'doctor') return 'Выберите, кого вылечить';
    return 'Город спит. Дождитесь утра';
  }
  if (phase === 'day') return 'Обсуждайте и ищите мафию';
  if (phase === 'voting') return 'Выберите, кого изгнать из города';
  if (phase === 'ended') return 'Партия завершена';
  return '';
}

export function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { nickname, playerId, roomCode, setPlayer } = usePlayerStore();
  const { room, emit, connected } = useSocket();
  const sound = useSound();

  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [roleFlipped, setRoleFlipped] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedOverlay, setCopiedOverlay] = useState(false);
  const [prevPhase, setPrevPhase] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const me = room?.players.find((p) => p.id === playerId);
  const isHost = me?.isHost || false;
  const myRole = me?.role as Role | undefined;

  useEffect(() => {
    if (!nickname || !code) {
      if (!nickname) navigate('/');
      return;
    }
    const connect = async () => {
      if (playerId && roomCode === code) {
        const result = await emit<{ success: boolean }>('reconnect', { code, playerId });
        if (result?.success) return;
      }
      const result = await emit<{ success: boolean; playerId?: string }>('joinRoom', {
        code,
        nickname,
      });
      if (result?.success && result.playerId) setPlayer(result.playerId, code);
    };
    connect();
  }, [code, nickname]);

  useEffect(() => {
    if (room && prevPhase && room.phase !== prevPhase) {
      if (room.phase === 'night') sound.night();
      if (room.phase === 'day') sound.day();
      if (room.phase === 'ended') sound.reveal();
      setSelectedTarget(null);
      setCheckResult(null);
    }
    if (room) setPrevPhase(room.phase);
  }, [room?.phase]);

  const showNotice = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 3200);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code || '');
    setCopiedCode(true);
    sound.click();
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const overlayUrl = `${window.location.origin}/overlay/${code}`;
  const copyOverlay = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopiedOverlay(true);
    sound.confirm();
    setTimeout(() => setCopiedOverlay(false), 1800);
  };

  const handleStartGame = async () => {
    const result = await emit<{ success: boolean; error?: string }>('startGame');
    if (result?.success) sound.reveal();
    else if (result?.error) {
      sound.error();
      showNotice(result.error);
    }
  };

  const handleNightAction = async () => {
    if (!selectedTarget) return;
    const result = await emit<{ success: boolean; error?: string; checkResult?: string }>(
      'nightAction',
      { targetId: selectedTarget },
    );
    if (result?.success) {
      sound.confirm();
      if (result.checkResult) {
        const labels: Record<string, string> = {
          mafia: 'Этот игрок — мафия',
          civilian: 'Этот игрок — мирный',
          sheriff: 'Этот игрок — шериф',
          not_sheriff: 'Этот игрок не шериф',
        };
        setCheckResult(labels[result.checkResult] || result.checkResult);
      }
      setSelectedTarget(null);
    } else {
      sound.error();
      showNotice(result?.error || 'Не удалось сделать ход');
    }
  };

  const handleVote = async () => {
    if (!selectedTarget) return;
    const result = await emit<{ success: boolean; error?: string }>('vote', {
      targetId: selectedTarget,
    });
    if (result?.success) {
      sound.confirm();
      setSelectedTarget(null);
    } else {
      sound.error();
      showNotice(result?.error || 'Голос не принят');
    }
  };

  if (!connected || !room) {
    return (
      <div className="grain vignette flex min-h-screen items-center justify-center bg-ink-1000">
        <div className="flex flex-col items-center gap-4 text-bone-600">
          <IconSpinner size={26} />
          <p className="text-sm">{connected ? 'Загружаем лобби' : 'Соединяемся с сервером'}</p>
        </div>
      </div>
    );
  }

  const hint = getHint(room.phase, room.nightSubPhase, myRole, isHost);
  const canAct =
    !isHost &&
    me?.alive &&
    room.phase === 'night' &&
    ((room.nightSubPhase === 'mafia' && (myRole === 'mafia' || myRole === 'don')) ||
      (room.nightSubPhase === 'don' && myRole === 'don') ||
      (room.nightSubPhase === 'sheriff' && myRole === 'sheriff') ||
      (room.nightSubPhase === 'doctor' && myRole === 'doctor'));
  const canVote = !isHost && me?.alive && room.phase === 'voting';
  const inLobby = room.phase === 'lobby';

  return (
    <div className="grain relative min-h-screen bg-ink-1000">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            room.phase === 'night'
              ? 'radial-gradient(80% 50% at 50% 0%, rgba(91,114,144,0.12) 0%, transparent 60%)'
              : room.phase === 'voting'
                ? 'radial-gradient(80% 50% at 50% 0%, rgba(184,50,61,0.13) 0%, transparent 60%)'
                : 'radial-gradient(80% 50% at 50% 0%, rgba(207,174,82,0.08) 0%, transparent 60%)',
          transition: 'background 1.2s ease',
        }}
      />

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <header className="sticky top-0 z-30 border-b border-bone-50/[0.08] bg-ink-1000/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-4">
            <IconButton label="На главную" onClick={() => navigate('/')}>
              <IconArrowLeft size={18} />
            </IconButton>
            <span className="hidden font-display text-[19px] tracking-[0.2em] text-bone-50 sm:block">
              МАФИЯ
            </span>
            <AuthorMark variant="compact" />
          </div>

          <button
            onClick={copyCode}
            className="group flex items-center gap-2.5 rounded-[7px] border border-bone-50/10
              bg-bone-50/[0.03] px-3.5 py-1.5 transition-colors hover:border-bone-50/20"
          >
            <span className="eyebrow hidden sm:inline">Код</span>
            <span className="font-mono text-[16px] tracking-[0.28em] text-bone-50">{code}</span>
            {copiedCode ? (
              <IconCheck size={14} className="text-sage-400" />
            ) : (
              <IconCopy size={14} className="text-bone-700 group-hover:text-bone-400" />
            )}
          </button>

          <div className="flex items-center gap-1">
            {isHost && (
              <Button
                variant="ghost"
                size="sm"
                onClick={copyOverlay}
                icon={<IconMonitor size={15} />}
                className="hidden sm:inline-flex"
              >
                {copiedOverlay ? 'Скопировано' : 'Экран OBS'}
              </Button>
            )}
            <IconButton label="Настройки" onClick={() => setSettingsOpen(true)}>
              <IconGear size={18} />
            </IconButton>
          </div>
        </div>
      </header>

      {/* Всплывающее уведомление */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed left-1/2 top-20 z-40 -translate-x-1/2 rounded-[7px] border
              border-blood-600/40 bg-ink-900 px-4 py-2.5 text-[13px] text-blood-300 shadow-2xl"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 mx-auto max-w-[1180px] px-5 py-6">
        <PhaseBanner
          phase={room.phase}
          nightSubPhase={room.nightSubPhase}
          dayNumber={room.dayNumber}
        />

        <motion.p
          key={hint}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center text-[14px] text-bone-400"
        >
          {hint}
        </motion.p>

        <AnimatePresence>
          {checkResult && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto mt-4 flex w-fit items-center gap-2.5 rounded-[7px]
                border border-steel-300/25 bg-steel-300/[0.07] px-4 py-2.5"
            >
              <IconSearch size={15} className="text-steel-300" />
              <span className="text-[13px] text-steel-300">{checkResult}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* ── Основная колонка ── */}
          <div className="space-y-5">
            {inLobby && (
              <Panel
                title="За столом"
                action={<Badge>{room.playerCount} человек</Badge>}
              >
                <ul className="divide-y divide-bone-50/[0.07]">
                  {room.players
                    .slice()
                    .sort((a, b) => a.slot - b.slot)
                    .map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="font-mono text-[11px] tnum text-bone-700">
                            {String(p.slot).padStart(2, '0')}
                          </span>
                          <span className="truncate text-[15px] text-bone-50">{p.nickname}</span>
                          {p.isHost && (
                            <Badge tone="brass" icon={<IconMic size={11} />}>
                              Ведущий
                            </Badge>
                          )}
                          {p.id === playerId && !p.isHost && <Badge>Вы</Badge>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {p.hasCamera ? (
                            <IconCamera size={15} className="text-sage-400" strokeWidth={1.4} />
                          ) : (
                            <IconCameraOff size={15} className="text-bone-700" strokeWidth={1.4} />
                          )}
                          {(me?.isCreator || isHost) && !p.isHost && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                emit('setHost', { playerId: p.id });
                                sound.confirm();
                              }}
                            >
                              Сделать ведущим
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                </ul>

                {isHost && (
                  <div className="mt-5">
                    <Button
                      onClick={handleStartGame}
                      disabled={!room.canStart}
                      size="lg"
                      className="w-full"
                      icon={<IconPlay size={16} />}
                    >
                      {room.canStart
                        ? 'Начать игру'
                        : `Ждём ещё ${Math.max(0, 6 - room.gamePlayerCount)}`}
                    </Button>
                  </div>
                )}
              </Panel>
            )}

            {inLobby && playerId && code && (
              <CameraSetup roomCode={code} playerId={playerId} hasCamera={!!me?.hasCamera} />
            )}

            {room.phase === 'roleReveal' && !isHost && myRole && (
              <div className="flex flex-col items-center py-8">
                <RoleCard
                  role={myRole}
                  flipped={roleFlipped}
                  onFlip={() => {
                    setRoleFlipped(!roleFlipped);
                    sound.reveal();
                  }}
                />
                <Button
                  onClick={() => emit('advanceRoleReveal')}
                  variant="secondary"
                  className="mt-7"
                >
                  Я запомнил
                </Button>
              </div>
            )}

            {room.phase === 'roleReveal' && isHost && (
              <Panel>
                <p className="py-4 text-center text-[14px] text-bone-600">
                  Игроки изучают свои карты
                </p>
              </Panel>
            )}

            {!inLobby && room.phase !== 'roleReveal' && (
              <>
                <PlayerGrid
                  players={room.players}
                  currentPlayerId={playerId || undefined}
                  selectable={Boolean(canAct || canVote)}
                  selectedId={selectedTarget}
                  onSelect={(id) => {
                    setSelectedTarget(id);
                    sound.click();
                  }}
                  showRoles={isHost}
                />

                {(canAct || canVote) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center pt-1"
                  >
                    <Button
                      onClick={canVote ? handleVote : handleNightAction}
                      disabled={!selectedTarget}
                      size="lg"
                      className="min-w-[240px]"
                    >
                      {canVote ? 'Проголосовать' : 'Подтвердить'}
                    </Button>
                  </motion.div>
                )}
              </>
            )}

            <AnimatePresence mode="wait">
              {room.lastNightResult && room.phase === 'day' && (
                <motion.div
                  key="night-result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-[9px] border px-5 py-4 text-center
                    ${
                      room.lastNightResult.peaceful
                        ? 'border-sage-600/35 bg-sage-600/[0.09]'
                        : 'border-blood-600/35 bg-blood-900/25'
                    }`}
                >
                  {room.lastNightResult.peaceful ? (
                    <p className="text-[15px] text-sage-400">
                      Ночь прошла спокойно — все живы
                    </p>
                  ) : (
                    <p className="text-[15px] text-blood-300">
                      <span className="font-display text-[18px]">
                        {room.lastNightResult.killedName}
                      </span>{' '}
                      не пережил эту ночь
                    </p>
                  )}
                </motion.div>
              )}

              {room.lastVoteResult?.exiledName && room.phase === 'night' && (
                <motion.div
                  key="vote-result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[9px] border border-brass-500/30 bg-brass-500/[0.08] px-5 py-4 text-center"
                >
                  <p className="text-[15px] text-brass-300">
                    Город изгнал{' '}
                    <span className="font-display text-[18px]">
                      {room.lastVoteResult.exiledName}
                    </span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {room.phase === 'ended' && room.winner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="panel flex flex-col items-center px-6 py-12 text-center"
              >
                <IconTrophy size={38} className="text-brass-400" strokeWidth={1.1} />
                <h2 className="mt-5 font-display text-[34px] leading-none text-bone-50">
                  {room.winner === 'city' ? 'Победа города' : 'Победа мафии'}
                </h2>
                <p className="mt-3 text-[14px] text-bone-600">
                  {room.winner === 'city'
                    ? 'Все члены мафии найдены и изгнаны'
                    : 'Мафия сравнялась числом с городом'}
                </p>
                <Button onClick={() => navigate('/')} variant="secondary" className="mt-7">
                  Вернуться на главную
                </Button>
              </motion.div>
            )}
          </div>

          {/* ── Боковая колонка ── */}
          <aside className="space-y-4">
            {isHost && (
              <HostPanel
                room={room}
                onAdvanceRoleReveal={() => emit('advanceRoleReveal')}
                onAdvanceNight={() => emit('hostAdvanceNight')}
                onResolveNight={() => {
                  emit('hostResolveNight');
                  sound.death();
                }}
                onStartVoting={() => emit('hostStartVoting')}
                onResolveVoting={() => {
                  emit('hostResolveVoting');
                  sound.death();
                }}
                onUpdateSettings={(s) => emit('updateSettings', { settings: s })}
              />
            )}

            {!isHost && myRole && !inLobby && room.phase !== 'roleReveal' && (
              <Panel title="Ваша роль">
                <RoleBadge role={myRole} />
                {(myRole === 'mafia' || myRole === 'don') && (
                  <div className="mt-4">
                    <span className="eyebrow mb-2 block">Ваша команда</span>
                    <ul className="space-y-1.5">
                      {room.players
                        .filter((p) => p.isTeammate || p.id === playerId)
                        .map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between text-[13px]"
                          >
                            <span className={p.alive ? 'text-bone-200' : 'text-bone-700 line-through'}>
                              {p.nickname}
                            </span>
                            {p.role && (
                              <span className="text-blood-400/80">
                                {ROLE_LABELS[p.role as Role]}
                              </span>
                            )}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </Panel>
            )}

            {isHost && inLobby && (
              <Panel title="Экран для OBS">
                <p className="mb-3 text-[13px] leading-relaxed text-bone-600">
                  Добавьте в OBS источник «Браузер» размером 1920 × 1080 и вставьте эту ссылку.
                </p>
                <CopyRow value={overlayUrl} onCopy={copyOverlay} copied={copiedOverlay} />
              </Panel>
            )}

            {!isHost && inLobby && (
              <Panel title="Как начать">
                <ol className="space-y-3 text-[13px] leading-relaxed text-bone-600">
                  {[
                    'Включите камеру в блоке слева',
                    'Дождитесь, пока соберутся все игроки',
                    'Ведущий запустит партию',
                  ].map((step, i) => (
                    <li key={step} className="flex gap-3">
                      <span className="font-mono text-[11px] tnum text-bone-700">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </Panel>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
