import { Panel } from './ui';
import { ROLE_EMBLEMS } from './Icons';
import type { Role } from '../types';
import { ROLE_COLORS, ROLE_LABELS } from '../types';

const ROLE_NOTES: Record<Role, string> = {
  don: 'Стреляет вместе с мафией и каждую ночь ищет шерифа. Его голос решающий.',
  mafia: 'Ночью выбирает жертву вместе с доном, днём притворяется мирным.',
  sheriff: 'Каждую ночь проверяет одного игрока: мафия или мирный.',
  doctor: 'Лечит одного игрока за ночь. Себя — один раз за партию.',
  civilian: 'Оружия нет, есть только логика и голос на дневном голосовании.',
};

const ORDER: Role[] = ['don', 'mafia', 'sheriff', 'doctor', 'civilian'];

export function RulesPanel({ includeDoctor }: { includeDoctor: boolean }) {
  const roles = ORDER.filter((r) => includeDoctor || r !== 'doctor');

  return (
    <Panel title="Правила за минуту">
      <ol className="space-y-2.5 text-[13px] leading-relaxed text-bone-600">
        <li className="flex gap-3">
          <span className="font-mono text-[11px] tnum text-bone-700">01</span>
          <span>Ночью мафия убивает, шериф и дон проверяют, доктор лечит.</span>
        </li>
        <li className="flex gap-3">
          <span className="font-mono text-[11px] tnum text-bone-700">02</span>
          <span>Днём город обсуждает и голосует, кого выгнать. Ничья — переголосовка.</span>
        </li>
        <li className="flex gap-3">
          <span className="font-mono text-[11px] tnum text-bone-700">03</span>
          <span>Город побеждает, когда мафии не осталось. Мафия — когда её столько же, сколько мирных.</span>
        </li>
      </ol>

      <div className="rule my-4" />

      <ul className="space-y-3">
        {roles.map((role) => {
          const Emblem = ROLE_EMBLEMS[role];
          const color = ROLE_COLORS[role];
          return (
            <li key={role} className="flex gap-3">
              <span
                className="mt-[2px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                style={{ borderColor: `${color}40`, background: `${color}12` }}
              >
                <Emblem size={13} style={{ color }} strokeWidth={1.4} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium" style={{ color }}>
                  {ROLE_LABELS[role]}
                </span>
                <span className="block text-[12.5px] leading-snug text-bone-600">
                  {ROLE_NOTES[role]}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
