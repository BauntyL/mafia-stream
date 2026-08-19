import { useSettings } from '../store/settings';
import { Modal, Toggle } from './ui';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

function VolumeRow({
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm text-bone-200">{label}</span>
        <span className="font-mono text-[12px] tnum text-bone-600">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        className="slider"
        min="0"
        max="1"
        step="0.05"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(+e.target.value)}
      />
      {hint && <p className="mt-1 text-xs text-bone-700">{hint}</p>}
    </div>
  );
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const {
    musicVolume,
    sfxVolume,
    animationsEnabled,
    roleHidden,
    setMusicVolume,
    setSfxVolume,
    setAnimationsEnabled,
    setRoleHidden,
  } = useSettings();

  return (
    <Modal open={open} onClose={onClose} title="Настройки" subtitle="Звук и отображение">
      <div className="space-y-6">
        <VolumeRow label="Звуки интерфейса" value={sfxVolume} onChange={setSfxVolume} />
        <VolumeRow
          label="Музыка"
          value={musicVolume}
          onChange={setMusicVolume}
          hint="Играет только в меню"
        />

        <div className="rule" />

        <div className="space-y-5">
          <Toggle
            checked={animationsEnabled}
            onChange={setAnimationsEnabled}
            label="Анимации"
            hint="Отключите на слабом компьютере"
          />
          <Toggle
            checked={roleHidden}
            onChange={setRoleHidden}
            label="Скрыть мою роль"
            hint="Если кто-то смотрит в ваш монитор"
          />
        </div>
      </div>
    </Modal>
  );
}
