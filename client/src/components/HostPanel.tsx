import { useState } from 'react';
import { Button } from './Button';
import { Panel, Toggle, Badge } from './ui';
import { IconClock, IconSkull, IconBan, IconRobot } from './Icons';
import { ROLE_EMBLEMS } from './Icons';
import type { RoomState, Role } from '../types';
import { ROLE_LABELS, ROLE_COLORS } from '../types';

interface HostPanelProps {
  room: RoomState;
  onUpdateSettings: (settings: Partial<RoomState['settings']>) => void;
  onTimer: (action: 'start' | 'stop', seconds?: number, label?: string) => void;
  onForceKill: (playerId: string) => void;
  onKick: (playerId: string) => void;
  onAddBot: () => void;
  onRemoveBots: () => void;
}

const TIMER_PRESETS = [30, 60, 120, 180];

export function HostPanel({
  room,
  onUpdateSettings,
  onTimer,
  onForceKill,
  onKick,
  onAddBot,
  onRemoveBots,
}: HostPanelProps) {
  const { phase, gamePlayerCount, settings } = room;
  const [confirmKill, setConfirmKill] = useState<string | null>(null);
  const botCount = room.players.filter((p) => p.isBot).length;
  const tablePlayers = room.players
    .filter((p) => !p.isHost)
    .sort((a, b) => a.slot - b.slot);

  const picks = room.nightPicks;
  const pickName = (id: string | null | undefined) =>
    id ? room.players.find((p) => p.id === id)?.nickname || '' : '';

  const mafiaPickIds = new Set(Object.values(picks?.mafia || {}).filter(Boolean));

  return (
    <div className="space-y-4">
      <Panel
        title="Управление"
        accent="brass"
        action={<Badge tone="brass">{gamePlayerCount} за столом</Badge>}
      >
        {phase === 'lobby' ? (
          <div className="space-y-4">
            <Toggle
              checked={settings.includeDoctor}
              onChange={(v) => onUpdateSettings({ includeDoctor: v })}
              label="Доктор в игре"
              hint="Лечит одного игрока каждую ночь"
            />
            <Toggle
              checked={settings.revealRoleOnDeath}
              onChange={(v) => onUpdateSettings({ revealRoleOnDeath: v })}
              label="Открывать роль выбывшего"
              hint="Роль видна всем сразу после смерти"
            />
            <Toggle
              checked={settings.chatEnabled}
              onChange={(v) => onUpdateSettings({ chatEnabled: v })}
              label="Текстовый чат"
              hint="Позволяет играть без голосовой связи"
            />
            <Toggle
              checked={settings.narratorEnabled !== false}
              onChange={(v) => onUpdateSettings({ narratorEnabled: v })}
              label="Диктор"
              hint="Озвучка сценария за столом. Можно выключить или пропускать по фразе"
            />
            <Toggle
              checked={!!settings.peacefulFirstNight}
              onChange={(v) => onUpdateSettings({ peacefulFirstNight: v })}
              label="Первая ночь без убийства"
              hint="Мафия знакомится, выстрела нет. Дон, шериф и доктор ходят как обычно"
            />
            <Toggle
              checked={!!settings.requireNominations}
              onChange={(v) => onUpdateSettings({ requireNominations: v })}
              label="Выставление перед голосованием"
              hint="На голосование попадают только выставленные. Если никого — сразу ночь"
            />
            <Toggle
              checked={settings.autoAdvanceNight}
              onChange={(v) => onUpdateSettings({ autoAdvanceNight: v })}
              label="Авто-переход ночью"
              hint="Ход сменится сам, когда все походили"
            />
            <Toggle
              checked={settings.showHostInOverlay}
              onChange={(v) => onUpdateSettings({ showHostInOverlay: v })}
              label="Ведущий в сетке OBS"
              hint="Показывать вашу камеру зрителям"
            />

            <div className="rule" />

            <div>
              <div className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm text-bone-200">Боты для теста</span>
                  <span className="mt-0.5 block text-xs text-bone-700">
                    Ходят и голосуют сами — можно проверить партию в одиночку
                  </span>
                </span>
                {botCount > 0 && <Badge>{botCount}</Badge>}
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={onAddBot}
                  disabled={gamePlayerCount >= room.maxPlayers}
                  icon={<IconRobot size={14} />}
                >
                  Добавить бота
                </Button>
                {botCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={onRemoveBots}>
                    Убрать всех
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <IconClock size={15} className="shrink-0 text-bone-600" />
              <span className="eyebrow">Таймер</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {TIMER_PRESETS.map((s) => (
                <button
                  key={s}
                  onClick={() => onTimer('start', s, s >= 120 ? 'Обсуждение' : 'Речь')}
                  className="rounded-[6px] border border-bone-50/10 py-1.5 text-[12px] tnum
                    text-bone-400 transition-colors hover:border-bone-50/25 hover:text-bone-50"
                >
                  {s < 60 ? `${s}с` : `${s / 60}м`}
                </button>
              ))}
            </div>
            {room.timer && (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => onTimer('stop')}>
                Остановить таймер
              </Button>
            )}
          </div>
        )}
      </Panel>

      <Panel
        title={phase === 'lobby' ? 'Игроки' : 'Роли — видно только вам'}
        action={
          phase === 'voting' ? (
            <Badge tone="blood">{room.votedCount ?? 0}/{room.voterCount ?? 0}</Badge>
          ) : phase === 'nominating' ? (
            <Badge tone="brass">{room.nominatedCount ?? 0} на столе</Badge>
          ) : undefined
        }
      >
        {tablePlayers.length === 0 ? (
          <p className="text-[13px] text-bone-700">За столом пока никого нет</p>
        ) : (
          <ul className="space-y-2">
            {tablePlayers.map((p) => {
              const role = p.role as Role | undefined;
              const Emblem = role ? ROLE_EMBLEMS[role] : null;
              const notes: string[] = [];
              if (picks) {
                if (mafiaPickIds.has(p.id)) notes.push('цель мафии');
                if (picks.don === p.id) notes.push('проверка дона');
                if (picks.sheriff === p.id) notes.push('проверка шерифа');
                if (picks.doctor === p.id) notes.push('лечит доктор');
              }
              const votesFor = room.voteTally?.[p.id] || 0;

              return (
                <li key={p.id} className="flex items-start justify-between gap-3 text-[13px]">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[11px] tnum text-bone-700">
                        {String(p.slot).padStart(2, '0')}
                      </span>
                      <span
                        className={`truncate ${p.alive ? 'text-bone-200' : 'text-bone-700 line-through'}`}
                      >
                        {p.nickname}
                      </span>
                      {p.isBot && (
                        <IconRobot size={12} className="shrink-0 text-bone-700" strokeWidth={1.5} />
                      )}
                      {!p.connected && !p.isBot && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brass-500/80" />
                      )}
                      {phase === 'roleReveal' && p.roleSeen && (
                        <span className="text-[10px] uppercase tracking-[0.14em] text-sage-400">
                          готов
                        </span>
                      )}
                    </span>
                    {(notes.length > 0 || votesFor > 0) && (
                      <span className="mt-0.5 text-[11px] text-brass-300/80">
                        {[...notes, votesFor ? `голосов: ${votesFor}` : ''].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    {Emblem && role && (
                      <span className="flex items-center gap-1.5">
                        <Emblem size={13} style={{ color: ROLE_COLORS[role] }} strokeWidth={1.4} />
                        <span style={{ color: `${ROLE_COLORS[role]}cc` }}>{ROLE_LABELS[role]}</span>
                      </span>
                    )}
                    {phase === 'lobby' ? (
                      <button
                        onClick={() => onKick(p.id)}
                        title="Убрать из лобби"
                        className="rounded p-1 text-bone-700 transition-colors hover:text-blood-300"
                      >
                        <IconBan size={13} />
                      </button>
                    ) : p.alive ? (
                      <button
                        onClick={() =>
                          confirmKill === p.id
                            ? (onForceKill(p.id), setConfirmKill(null))
                            : setConfirmKill(p.id)
                        }
                        onBlur={() => setConfirmKill(null)}
                        title="Вывести из игры"
                        className={`rounded p-1 transition-colors ${
                          confirmKill === p.id
                            ? 'text-blood-300'
                            : 'text-bone-700 hover:text-blood-300'
                        }`}
                      >
                        <IconSkull size={13} />
                      </button>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {picks && room.phase === 'night' && (
          <div className="mt-4">
            <div className="rule mb-3" />
            <ul className="space-y-1 text-[12px] text-bone-600">
              {Object.keys(picks.mafia).length > 0 && (
                <li>
                  Мафия целится:{' '}
                  <span className="text-blood-300">
                    {Object.values(picks.mafia)
                      .map((id) => pickName(id))
                      .filter(Boolean)
                      .join(', ') || 'пропуск'}
                  </span>
                </li>
              )}
              {picks.doctor && (
                <li>
                  Доктор лечит: <span className="text-sage-400">{pickName(picks.doctor)}</span>
                </li>
              )}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  );
}
