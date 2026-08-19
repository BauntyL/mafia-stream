import { Button } from './Button';
import { Panel, Toggle, Badge } from './ui';
import { IconChevronRight, IconGavel, IconMoon, IconPlay, IconTrophy } from './Icons';
import { ROLE_EMBLEMS } from './Icons';
import type { RoomState, Role } from '../types';
import { ROLE_LABELS, ROLE_COLORS, NIGHT_SUBPHASE_LABELS } from '../types';

interface HostPanelProps {
  room: RoomState;
  onAdvanceRoleReveal: () => void;
  onAdvanceNight: () => void;
  onResolveNight: () => void;
  onStartVoting: () => void;
  onResolveVoting: () => void;
  onUpdateSettings: (settings: Partial<RoomState['settings']>) => void;
}

export function HostPanel({
  room,
  onAdvanceRoleReveal,
  onAdvanceNight,
  onResolveNight,
  onStartVoting,
  onResolveVoting,
  onUpdateSettings,
}: HostPanelProps) {
  const { phase, nightSubPhase, gamePlayerCount, settings } = room;
  const alivePlayers = room.players.filter((p) => !p.isHost && p.role);

  return (
    <Panel
      title="Панель ведущего"
      accent="brass"
      action={<Badge tone="brass">{gamePlayerCount} игроков</Badge>}
    >
      {phase === 'lobby' && (
        <div className="space-y-5">
          <div className="space-y-4">
            <Toggle
              checked={settings.includeDoctor}
              onChange={(v) => onUpdateSettings({ includeDoctor: v })}
              label="Доктор в игре"
              hint="Лечит одного игрока каждую ночь"
            />
            <Toggle
              checked={settings.showHostInOverlay}
              onChange={(v) => onUpdateSettings({ showHostInOverlay: v })}
              label="Ведущий в сетке OBS"
              hint="Показывать вашу камеру зрителям"
            />
          </div>
          {!room.canStart && (
            <p className="text-[13px] text-brass-300">
              Нужно ещё {Math.max(0, 6 - gamePlayerCount)} игроков, чтобы начать
            </p>
          )}
        </div>
      )}

      {phase === 'roleReveal' && (
        <div className="space-y-3">
          <p className="text-[13px] text-bone-600">
            Игроки открывают свои карты. Когда все готовы — начинайте ночь.
          </p>
          <Button
            onClick={onAdvanceRoleReveal}
            variant="brass"
            className="w-full"
            iconRight={<IconChevronRight size={16} />}
          >
            Начать ночь
          </Button>
        </div>
      )}

      {phase === 'night' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 rounded-[7px] border border-bone-50/10 bg-ink-1000/50 px-3.5 py-2.5">
            <IconMoon size={16} className="text-steel-300" strokeWidth={1.4} />
            <span className="text-[13px] text-bone-200">
              {nightSubPhase ? NIGHT_SUBPHASE_LABELS[nightSubPhase] : ''}
            </span>
          </div>
          {nightSubPhase !== 'resolve' ? (
            <Button
              onClick={onAdvanceNight}
              variant="secondary"
              className="w-full"
              iconRight={<IconChevronRight size={16} />}
            >
              Следующий ход
            </Button>
          ) : (
            <Button onClick={onResolveNight} variant="brass" className="w-full">
              Объявить утро
            </Button>
          )}
        </div>
      )}

      {phase === 'day' && (
        <div className="space-y-3">
          {room.lastNightResult && (
            <div className="rounded-[7px] border border-bone-50/10 bg-ink-1000/50 px-3.5 py-2.5 text-[13px]">
              {room.lastNightResult.peaceful ? (
                <span className="text-sage-400">Ночь прошла спокойно</span>
              ) : (
                <span className="text-blood-300">Погиб {room.lastNightResult.killedName}</span>
              )}
            </div>
          )}
          <Button
            onClick={onStartVoting}
            variant="brass"
            className="w-full"
            icon={<IconGavel size={16} />}
          >
            Начать голосование
          </Button>
        </div>
      )}

      {phase === 'voting' && (
        <Button onClick={onResolveVoting} variant="brass" className="w-full">
          Объявить результат
        </Button>
      )}

      {phase === 'ended' && room.winner && (
        <div className="flex items-center gap-3 py-1">
          <IconTrophy size={22} className="text-brass-300" strokeWidth={1.3} />
          <span className="font-display text-[19px] text-bone-50">
            {room.winner === 'city' ? 'Победа города' : 'Победа мафии'}
          </span>
        </div>
      )}

      {phase !== 'lobby' && alivePlayers.length > 0 && (
        <div className="mt-5">
          <div className="rule mb-4" />
          <span className="eyebrow mb-3 block">Роли — видно только вам</span>
          <ul className="space-y-1.5">
            {alivePlayers.map((p) => {
              const role = p.role as Role;
              const Emblem = ROLE_EMBLEMS[role];
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="flex items-center gap-2 truncate">
                    <span className="font-mono text-[11px] tnum text-bone-700">
                      {String(p.slot).padStart(2, '0')}
                    </span>
                    <span className={p.alive ? 'text-bone-200' : 'text-bone-700 line-through'}>
                      {p.nickname}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <Emblem size={13} style={{ color: ROLE_COLORS[role] }} strokeWidth={1.4} />
                    <span style={{ color: `${ROLE_COLORS[role]}cc` }}>{ROLE_LABELS[role]}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Panel>
  );
}

export function StartGameButton({
  canStart,
  missing,
  onStart,
}: {
  canStart: boolean;
  missing: number;
  onStart: () => void;
}) {
  return (
    <Button
      onClick={onStart}
      disabled={!canStart}
      size="lg"
      className="w-full"
      icon={<IconPlay size={16} />}
    >
      {canStart ? 'Начать игру' : `Ждём ещё ${missing}`}
    </Button>
  );
}
