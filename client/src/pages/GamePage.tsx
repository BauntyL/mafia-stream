import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerGrid, PhaseBanner } from '../components/PlayerGrid';
import { RoleCard, RoleBadge } from '../components/RoleCard';
import { CameraSetup } from '../components/CameraSetup';
import { HostPanel } from '../components/HostPanel';
import { HostScript } from '../components/HostScript';
import { SettingsPanel } from '../components/SettingsPanel';
import { AuthorMark } from '../components/AuthorMark';
import { NightKillCutscene, useNightKillCutscene } from '../components/NightKillCutscene';
import { Chat } from '../components/Chat';
import { GameLog, CheckHistory } from '../components/GameLog';
import { RulesPanel } from '../components/RulesPanel';
import { TimerBar } from '../components/Timer';
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
  IconMonitor,
  IconMoon,
  IconBan,
  IconRobot,
} from '../components/Icons';
import { usePlayerStore } from '../store/settings';
import { useSocket } from '../hooks/useSocket';
import { useLobby } from '../hooks/useLobby';
import { useCameraPublisher } from '../hooks/useCameraPublisher';
import { useNarrator, stopNarrator } from '../hooks/useNarrator';
import { stopCamera } from '../webrtc/session';
import { useSound } from '../hooks/useSound';
import type { Player, Role, RoomState } from '../types';
import { ROLE_LABELS } from '../types';
import { avatarUrl } from '../utils/avatar';
import type { ScriptActionKey } from '../utils/script';

const CHECK_TOASTS: Record<string, string> = {
  mafia: 'Этот игрок — мафия',
  civilian: 'Этот игрок — мирный житель',
  sheriff: 'Этот игрок — шериф',
  not_sheriff: 'Этот игрок не шериф',
};

const ACTION_TITLES: Record<string, { title: string; hint: string; confirm: string }> = {
  mafia: {
    title: 'Выберите жертву',
    hint: 'Договоритесь со своими в тайном чате. Подтвердить можно только один раз.',
    confirm: 'Убить',
  },
  don: {
    title: 'Кого проверяем на шерифа',
    hint: 'Проверка одна за ночь и изменить её нельзя.',
    confirm: 'Проверить',
  },
  sheriff: {
    title: 'Кого проверяем',
    hint: 'Проверка одна за ночь и изменить её нельзя.',
    confirm: 'Проверить',
  },
  doctor: {
    title: 'Кого лечим этой ночью',
    hint: 'Себя можно вылечить один раз за игру, одного игрока — не две ночи подряд.',
    confirm: 'Лечить',
  },
};

function WaitingCard({ text, icon }: { text: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-[9px] border border-bone-50/[0.08] bg-ink-1000/50 px-5 py-5">
      {icon ?? <IconSpinner size={16} className="text-bone-700" />}
      <span className="text-[14px] text-bone-600">{text}</span>
    </div>
  );
}

/* ── Панель действий игрока ─────────────────────────────────── */

function PlayerActions({
  room,
  me,
  selected,
  onConfirm,
  onSkip,
}: {
  room: RoomState;
  me: Player;
  selected: string | null;
  onConfirm: () => void;
  onSkip: () => void;
}) {
  const you = room.you;
  if (!you || room.phase === 'ended') return null;

  const nameOf = (id: string | null) =>
    id ? room.players.find((p) => p.id === id)?.nickname || '' : '';

  if (!me.alive) {
    return (
      <WaitingCard
        text="Вы выбыли. Можно смотреть игру и общаться в комнате выбывших."
        icon={<IconBan size={16} className="text-bone-700" />}
      />
    );
  }

  if (room.phase === 'night') {
    if (you.actionLocked) {
      return (
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-[9px] border border-brass-500/35 bg-brass-500/[0.08] px-5 py-4">
          <IconCheck size={16} className="text-brass-300" />
          <span className="text-[14px] text-brass-200">
            {you.actionSkipped ? 'Вы пропустили ход' : `Ваш выбор: ${nameOf(you.actionTargetId)}`}
          </span>
          <span className="text-[13px] text-bone-700">Изменить уже нельзя</span>
        </div>
      );
    }

    if (!you.canAct) {
      return <WaitingCard text="Город спит. Дождитесь утра." icon={<IconMoon size={16} className="text-steel-300/70" />} />;
    }

    const meta = ACTION_TITLES[room.nightSubPhase || 'mafia'];
    const peacefulMeet =
      room.nightSubPhase === 'mafia' &&
      room.dayNumber <= 1 &&
      room.settings.peacefulFirstNight;
    const canSkip = room.nightSubPhase === 'mafia' || room.nightSubPhase === 'doctor';

    if (peacefulMeet) {
      return (
        <div className="rounded-[9px] border border-blood-600/30 bg-blood-900/[0.14] px-5 py-4">
          <p className="text-center font-display text-[19px] text-bone-50">Посмотрите на своих</p>
          <p className="mt-1.5 text-center text-[12.5px] text-bone-600">
            Первая ночь без выстрела. Запомните лица и подтвердите, что готовы спать.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <Button onClick={onSkip} size="lg" className="min-w-[220px]">
              Мы познакомились
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-[9px] border border-blood-600/30 bg-blood-900/[0.14] px-5 py-4">
        <p className="text-center font-display text-[19px] text-bone-50">{meta.title}</p>
        <p className="mt-1.5 text-center text-[12.5px] text-bone-600">{meta.hint}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          <Button onClick={onConfirm} disabled={!selected} size="lg" className="min-w-[220px]">
            {selected ? `${meta.confirm}: ${nameOf(selected)}` : 'Выберите игрока'}
          </Button>
          {canSkip && (
            <Button onClick={onSkip} variant="secondary" size="lg">
              Пропустить
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (room.phase === 'nominating') {
    if (you.nominationLocked) {
      return (
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-[9px] border border-brass-500/35 bg-brass-500/[0.08] px-5 py-4">
          <IconCheck size={16} className="text-brass-300" />
          <span className="text-[14px] text-brass-200">
            {you.nominationSkipped
              ? 'Вы никого не выставили'
              : `Выставлен: ${nameOf(you.nominationTargetId || null)}`}
          </span>
          <span className="text-[13px] text-bone-700">
            Выставили {room.votedCount ?? 0} из {room.voterCount ?? 0}
          </span>
        </div>
      );
    }

    return (
      <div className="rounded-[9px] border border-brass-500/30 bg-brass-500/[0.08] px-5 py-4">
        <p className="text-center font-display text-[19px] text-bone-50">Кого выставляем</p>
        <p className="mt-1.5 text-center text-[12.5px] text-bone-600">
          На голосование попадут только выставленные игроки.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          <Button onClick={onConfirm} disabled={!selected} size="lg" className="min-w-[220px]">
            {selected ? `Выставить: ${nameOf(selected)}` : 'Выберите игрока'}
          </Button>
          <Button onClick={onSkip} variant="secondary" size="lg">
            Не выставлять
          </Button>
        </div>
      </div>
    );
  }

  if (room.phase === 'voting') {
    if (you.voteLocked) {
      return (
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-[9px] border border-brass-500/35 bg-brass-500/[0.08] px-5 py-4">
          <IconCheck size={16} className="text-brass-300" />
          <span className="text-[14px] text-brass-200">
            {you.voteSkipped ? 'Вы воздержались' : `Ваш голос: ${nameOf(you.voteTargetId)}`}
          </span>
          <span className="text-[13px] text-bone-700">
            Проголосовали {room.votedCount ?? 0} из {room.voterCount ?? 0}
          </span>
        </div>
      );
    }

    return (
      <div className="rounded-[9px] border border-blood-600/30 bg-blood-900/[0.14] px-5 py-4">
        <p className="text-center font-display text-[19px] text-bone-50">
          {room.revoteRound > 0 ? 'Переголосовка' : 'Кого изгоняем из города'}
        </p>
        <p className="mt-1.5 text-center text-[12.5px] text-bone-600">
          Голос отдаётся один раз и изменить его нельзя.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          <Button onClick={onConfirm} disabled={!selected} size="lg" className="min-w-[220px]">
            {selected ? `Голосовать: ${nameOf(selected)}` : 'Выберите игрока'}
          </Button>
          <Button onClick={onSkip} variant="secondary" size="lg">
            Воздержаться
          </Button>
        </div>
      </div>
    );
  }

  if (room.phase === 'day') {
    return (
      <WaitingCard
        text={
          room.speaking
            ? `Говорит ${room.speaking.nickname}. Остальные слушают.`
            : 'Обсуждайте и ищите мафию. Ведущий откроет голосование.'
        }
        icon={<IconMic size={16} className="text-brass-300/70" />}
      />
    );
  }

  return null;
}

/* ── Страница ───────────────────────────────────────────────── */

export function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { nickname, playerId, roomCode, setPlayer } = usePlayerStore();
  const { room, emit, connected, socket } = useSocket();
  const sound = useSound();
  useCameraPublisher(socket);
  useNarrator(room);

  useEffect(() => () => stopCamera(), []);

  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [roleFlipped, setRoleFlipped] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedOverlay, setCopiedOverlay] = useState(false);
  const [prevPhase, setPrevPhase] = useState<string | null>(null);
  const [prevStep, setPrevStep] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const nightKill = useNightKillCutscene(room);

  const me = room?.players.find((p) => p.id === playerId);
  const isHost = me?.isHost || false;
  const myRole = me?.role as Role | undefined;

  useLobby(nickname, 'table');

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
      const result = await emit<{ success: boolean; playerId?: string; error?: string }>(
        'joinRoom',
        { code, nickname },
      );
      if (result?.success && result.playerId) setPlayer(result.playerId, code);
      else if (result?.error) showNotice(result.error);
    };
    connect();
  }, [code, nickname]);

  useEffect(() => {
    const onKicked = () => {
      showNotice('Ведущий убрал вас из лобби');
      window.setTimeout(() => navigate('/'), 1200);
    };
    socket.on('kicked', onKicked);
    return () => {
      socket.off('kicked', onKicked);
    };
  }, [socket, navigate]);

  useEffect(() => {
    if (room && prevPhase && room.phase !== prevPhase) {
      if (room.phase === 'night') sound.night();
      if (room.phase === 'day') sound.day();
      if (room.phase === 'ended') sound.reveal();
      setSelectedTarget(null);
      setCheckResult(null);
      setRoleFlipped(false);
    }
    if (room) setPrevPhase(room.phase);
  }, [room?.phase]);

  // Новый ход ночью — сбрасываем выделение
  useEffect(() => {
    const key = `${room?.phase}-${room?.nightSubPhase}-${room?.dayNumber}`;
    if (prevStep && key !== prevStep) setSelectedTarget(null);
    setPrevStep(key);
  }, [room?.nightSubPhase, room?.dayNumber, room?.phase]);

  const showNotice = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 3200);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code || '');
    setCopiedCode(true);
    sound.click();
    window.setTimeout(() => setCopiedCode(false), 1800);
  };

  const overlayUrl = `${window.location.origin}/overlay/${code}`;
  const copyOverlay = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopiedOverlay(true);
    sound.confirm();
    window.setTimeout(() => setCopiedOverlay(false), 1800);
  };

  const handleHostAction = async (key: ScriptActionKey) => {
    if (key === 'startGame') {
      const result = await emit<{ success: boolean; error?: string }>('startGame');
      if (result?.success) sound.reveal();
      else {
        sound.error();
        showNotice(result?.error || 'Не удалось начать игру');
      }
      return;
    }
    if (key === 'skipNarrator') {
      stopNarrator();
      await emit('skipNarrator');
      return;
    }
    const events: Record<Exclude<ScriptActionKey, 'startGame' | 'skipNarrator'>, string> = {
      startNight: 'hostStartNight',
      advanceNight: 'hostAdvanceNight',
      resolveNight: 'hostResolveNight',
      nextSpeaker: 'hostNextSpeaker',
      startVoting: 'hostStartVoting',
      resolveVoting: 'hostResolveVoting',
      restart: 'restartGame',
    };
    const result = await emit<{ success: boolean; error?: string }>(events[key]);
    if (result && result.success === false) {
      sound.error();
      showNotice(result.error || 'Сейчас нельзя');
      return;
    }
    if (key === 'resolveNight' || key === 'resolveVoting') sound.death();
    else sound.confirm();
  };

  const submitNight = async (targetId: string | null) => {
    const result = await emit<{ success: boolean; error?: string; checkResult?: string }>(
      'nightAction',
      { targetId },
    );
    if (result?.success) {
      sound.confirm();
      if (result.checkResult) setCheckResult(CHECK_TOASTS[result.checkResult] || result.checkResult);
      setSelectedTarget(null);
    } else {
      sound.error();
      showNotice(result?.error || 'Не удалось сделать ход');
    }
  };

  const submitVote = async (targetId: string | null) => {
    const result = await emit<{ success: boolean; error?: string }>('vote', { targetId });
    if (result?.success) {
      sound.confirm();
      setSelectedTarget(null);
    } else {
      sound.error();
      showNotice(result?.error || 'Голос не принят');
    }
  };

  const submitNomination = async (targetId: string | null) => {
    const result = await emit<{ success: boolean; error?: string }>('nominate', { targetId });
    if (result?.success) {
      sound.confirm();
      setSelectedTarget(null);
    } else {
      sound.error();
      showNotice(result?.error || 'Не удалось выставить');
    }
  };

  const sendChat = async (text: string): Promise<string | null> => {
    const result = await emit<{ success: boolean; error?: string }>('chat', { text });
    return result?.success ? null : result?.error || 'Сообщение не отправлено';
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

  const inLobby = room.phase === 'lobby';
  const inGame = !inLobby && room.phase !== 'roleReveal';
  const you = room.you;
  const peacefulMeet =
    room.phase === 'night' &&
    room.nightSubPhase === 'mafia' &&
    room.dayNumber <= 1 &&
    room.settings.peacefulFirstNight;
  const selectable = Boolean(
    !isHost &&
      me?.alive &&
      !peacefulMeet &&
      ((room.phase === 'night' && you?.canAct) ||
        (room.phase === 'voting' && !you?.voteLocked) ||
        (room.phase === 'nominating' && !you?.nominationLocked)),
  );

  // Подписи под игроками: кто как голосует, куда целится мафия
  const annotations: Record<string, string> = {};
  if (room.phase === 'night' && room.mafiaVotes) {
    Object.entries(room.mafiaVotes).forEach(([voterId, targetId]) => {
      if (!targetId) return;
      const voter = room.players.find((p) => p.id === voterId);
      if (!voter || voter.id === playerId) return;
      annotations[targetId] = `выбор ${voter.nickname}`;
    });
  }
  if (isHost && room.phase === 'night' && room.nightPicks) {
    const { don, sheriff, doctor } = room.nightPicks;
    if (don) annotations[don] = 'проверка дона';
    if (sheriff) annotations[sheriff] = 'проверка шерифа';
    if (doctor) annotations[doctor] = 'лечит доктор';
  }

  const hostPlayer = room.players.find((p) => p.isHost);
  const tablePlayers = room.players.filter((p) => !p.isHost).sort((a, b) => a.slot - b.slot);

  return (
    <div className="grain relative min-h-screen bg-ink-1000">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            room.phase === 'night'
              ? 'radial-gradient(80% 50% at 50% 0%, rgba(91,114,144,0.12) 0%, transparent 60%)'
              : room.phase === 'voting' || room.phase === 'nominating'
                ? 'radial-gradient(80% 50% at 50% 0%, rgba(184,50,61,0.13) 0%, transparent 60%)'
                : 'radial-gradient(80% 50% at 50% 0%, rgba(207,174,82,0.08) 0%, transparent 60%)',
          transition: 'background 1.2s ease',
        }}
      />

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <NightKillCutscene open={nightKill.open} victim={nightKill.victim} onDone={nightKill.close} />

      <header className="sticky top-0 z-30 border-b border-bone-50/[0.08] bg-ink-1000/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-5 py-3">
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

      <main className="relative z-10 mx-auto max-w-[1320px] px-5 py-6">
        <PhaseBanner
          phase={room.phase}
          nightSubPhase={room.nightSubPhase}
          dayNumber={room.dayNumber}
          aliveCount={room.aliveCount}
        />

        {room.timer && !isHost && (
          <div className="mt-4">
            <TimerBar timer={room.timer} />
          </div>
        )}

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

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
          {/* ── Основная колонка ── */}
          <div className="min-w-0 space-y-5">
            {isHost && <HostScript room={room} onAction={handleHostAction} />}

            {inLobby && (
              <Panel title="За столом" action={<Badge>{room.gamePlayerCount} игроков</Badge>}>
                {hostPlayer && (
                  <div className="mb-3 flex items-center gap-3 rounded-[7px] border border-brass-500/25 bg-brass-500/[0.06] px-3 py-2.5">
                    <img
                      src={avatarUrl(0)}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-brass-400/30"
                      draggable={false}
                    />
                    <span className="truncate text-[15px] text-bone-50">{hostPlayer.nickname}</span>
                    <Badge tone="brass" icon={<IconMic size={11} />}>
                      Ведущий
                    </Badge>
                  </div>
                )}

                <ul className="divide-y divide-bone-50/[0.07]">
                  {tablePlayers.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={avatarUrl(p.slot)}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-bone-50/10"
                          draggable={false}
                        />
                        <span className="font-mono text-[11px] tnum text-bone-700">
                          {String(p.slot).padStart(2, '0')}
                        </span>
                        <span className="truncate text-[15px] text-bone-50">{p.nickname}</span>
                        {p.id === playerId && <Badge>Вы</Badge>}
                        {p.isBot && <Badge icon={<IconRobot size={11} />}>Бот</Badge>}
                        {p.ready && !p.isBot && (
                          <Badge tone="sage" icon={<IconCheck size={11} />}>
                            Готов
                          </Badge>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {p.isBot ? null : p.hasCamera ? (
                          <IconCamera size={15} className="text-sage-400" strokeWidth={1.4} />
                        ) : (
                          <IconCameraOff size={15} className="text-bone-700" strokeWidth={1.4} />
                        )}
                        {(me?.isCreator || isHost) && !p.isBot && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              emit('setHost', { playerId: p.id });
                              sound.confirm();
                            }}
                          >
                            Ведущий
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {tablePlayers.length === 0 && (
                  <p className="py-4 text-center text-[13px] text-bone-700">
                    Отправьте код друзьям — они появятся здесь
                  </p>
                )}

                {!isHost && me && (
                  <Button
                    onClick={() => {
                      emit('setReady', { ready: !me.ready });
                      sound.click();
                    }}
                    variant={me.ready ? 'secondary' : 'primary'}
                    className="mt-5 w-full"
                    icon={<IconCheck size={16} />}
                  >
                    {me.ready ? 'Я ещё не готов' : 'Я готов'}
                  </Button>
                )}
              </Panel>
            )}

            {inLobby && <CameraSetup hasCamera={!!me?.hasCamera} />}

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
                  onClick={() => {
                    emit('roleSeen');
                    sound.confirm();
                  }}
                  variant={me?.roleSeen ? 'secondary' : 'primary'}
                  disabled={!roleFlipped || me?.roleSeen}
                  className="mt-7"
                  icon={me?.roleSeen ? <IconCheck size={16} /> : undefined}
                >
                  {me?.roleSeen ? 'Ждём остальных' : 'Я запомнил роль'}
                </Button>
                {!roleFlipped && (
                  <p className="mt-3 text-[12.5px] text-bone-700">Нажмите на карту, чтобы открыть</p>
                )}
              </div>
            )}

            {inGame && (
              <>
                <PlayerGrid
                  players={room.players}
                  currentPlayerId={playerId || undefined}
                  selectable={selectable}
                  selectedId={selectedTarget}
                  onSelect={(id) => {
                    setSelectedTarget(id);
                    sound.click();
                  }}
                  lockedTargetId={
                    room.phase === 'voting'
                      ? you?.voteLocked
                        ? you.voteTargetId
                        : null
                      : room.phase === 'nominating'
                        ? you?.nominationLocked
                          ? you.nominationTargetId
                          : null
                        : you?.actionLocked
                          ? you.actionTargetId
                          : null
                  }
                  tally={
                    room.phase === 'voting'
                      ? room.voteTally
                      : room.phase === 'nominating'
                        ? room.nominationTally
                        : undefined
                  }
                  candidateIds={
                    room.phase === 'voting'
                      ? room.voteCandidateIds
                      : room.phase === 'nominating' && playerId
                        ? room.players
                            .filter((p) => !p.isHost && p.alive && p.id !== playerId)
                            .map((p) => p.id)
                        : null
                  }
                  annotations={annotations}
                  speakingId={room.speaking?.playerId || null}
                />

                {!isHost && me && (
                  <PlayerActions
                    room={room}
                    me={me}
                    selected={selectedTarget}
                    onConfirm={() =>
                      room.phase === 'voting'
                        ? submitVote(selectedTarget)
                        : room.phase === 'nominating'
                          ? submitNomination(selectedTarget)
                          : submitNight(selectedTarget)
                    }
                    onSkip={() =>
                      room.phase === 'voting'
                        ? submitVote(null)
                        : room.phase === 'nominating'
                          ? submitNomination(null)
                          : submitNight(null)
                    }
                  />
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
                      {room.lastNightResult.saved
                        ? 'Доктор успел вовремя — все живы'
                        : room.dayNumber === 1 && room.settings.peacefulFirstNight
                          ? 'Первая ночь без выстрела — все живы'
                          : 'Ночь прошла спокойно — все живы'}
                    </p>
                  ) : (
                    <p className="text-[15px] text-blood-300">
                      <span className="font-display text-[18px]">
                        {room.lastNightResult.killedName}
                      </span>{' '}
                      не пережил эту ночь
                      {room.lastNightResult.killedRole && (
                        <span className="text-bone-600">
                          {' '}
                          · {ROLE_LABELS[room.lastNightResult.killedRole]}
                        </span>
                      )}
                    </p>
                  )}
                </motion.div>
              )}

              {room.lastVoteResult && room.phase === 'night' && (
                <motion.div
                  key="vote-result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[9px] border border-brass-500/30 bg-brass-500/[0.08] px-5 py-4 text-center"
                >
                  {room.lastVoteResult.exiledName ? (
                    <p className="text-[15px] text-brass-300">
                      Город изгнал{' '}
                      <span className="font-display text-[18px]">
                        {room.lastVoteResult.exiledName}
                      </span>
                      {room.lastVoteResult.exiledRole && (
                        <span className="text-bone-600">
                          {' '}
                          · {ROLE_LABELS[room.lastVoteResult.exiledRole]}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-[15px] text-bone-400">Никто не был изгнан</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {room.phase === 'ended' && room.winner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="panel flex flex-col items-center px-6 py-10 text-center"
              >
                <IconTrophy size={38} className="text-brass-400" strokeWidth={1.1} />
                <h2 className="mt-5 font-display text-[34px] leading-none text-bone-50">
                  {room.winner === 'city' ? 'Победа города' : 'Победа мафии'}
                </h2>
                <p className="mt-3 text-[14px] text-bone-600">
                  {room.winner === 'city'
                    ? 'Вся мафия найдена и изгнана'
                    : 'Мафия сравнялась числом с городом'}
                </p>
                {!isHost && (
                  <p className="mt-5 text-[13px] text-bone-700">
                    Ведущий может собрать новый стол — вы останетесь в лобби
                  </p>
                )}
              </motion.div>
            )}

            {inGame && room.settings.chatEnabled && (
              <div className="lg:hidden">
                <Chat
                  room={room}
                  me={me}
                  onSend={sendChat}
                  className="h-[min(420px,52vh)]"
                />
              </div>
            )}
          </div>

          {/* ── Боковая колонка ── */}
          <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-[4.5rem] lg:h-[calc(100vh-5.25rem)] lg:overflow-hidden">
            {room.settings.chatEnabled && (
              <Chat
                room={room}
                me={me}
                onSend={sendChat}
                className={
                  inLobby
                    ? 'h-[300px] shrink-0 lg:h-auto lg:min-h-0 lg:flex-[1.15]'
                    : 'hidden min-h-0 flex-[1.15] lg:flex'
                }
              />
            )}

            <div className="min-h-0 space-y-4 overflow-y-auto lg:flex-1">
            {isHost && (
              <HostPanel
                room={room}
                onUpdateSettings={(s) => emit('updateSettings', { settings: s })}
                onTimer={(action, seconds, label) =>
                  emit('hostTimer', { action, seconds, label })
                }
                onForceKill={(id) => emit('hostForceKill', { playerId: id })}
                onKick={(id) => emit('kickPlayer', { playerId: id })}
                onAddBot={async () => {
                  const res = await emit<{ success: boolean; error?: string }>('addBot');
                  if (res?.error) showNotice(res.error);
                  else sound.click();
                }}
                onRemoveBots={() => emit('removeBots')}
              />
            )}

            {!inLobby && (
              <Panel title="Камера">
                <CameraSetup compact hasCamera={!!me?.hasCamera} />
              </Panel>
            )}

            {!isHost && myRole && !inLobby && (
              <Panel title="Ваша роль">
                <RoleBadge role={myRole} />
                {(myRole === 'mafia' || myRole === 'don') && (
                  <div className="mt-4">
                    <span className="eyebrow mb-2 block">Ваша команда</span>
                    <ul className="space-y-1.5">
                      {room.players
                        .filter((p) => p.isTeammate || p.id === playerId)
                        .sort((a, b) => a.slot - b.slot)
                        .map((p) => (
                          <li key={p.id} className="flex items-center justify-between text-[13px]">
                            <span
                              className={p.alive ? 'text-bone-200' : 'text-bone-700 line-through'}
                            >
                              {String(p.slot).padStart(2, '0')} · {p.nickname}
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

            {!isHost && you && you.checks.length > 0 && <CheckHistory checks={you.checks} />}

            {isHost && inLobby && (
              <Panel title="Экран для OBS">
                <p className="mb-3 text-[13px] leading-relaxed text-bone-600">
                  Добавьте в OBS источник «Браузер» размером 1920 × 1080 и вставьте эту ссылку.
                </p>
                <CopyRow value={overlayUrl} onCopy={copyOverlay} copied={copiedOverlay} />
              </Panel>
            )}

            {inLobby && <RulesPanel includeDoctor={room.settings.includeDoctor} />}

            {!isHost && inLobby && (
              <Panel title="Как начать">
                <ol className="space-y-3 text-[13px] leading-relaxed text-bone-600">
                  {[
                    'Включите камеру ниже — или играйте без неё, вам дадут аватар',
                    'Нажмите «Я готов»',
                    'Ведущий раздаст роли и начнёт партию',
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

            {!inLobby && <GameLog entries={room.log} />}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
