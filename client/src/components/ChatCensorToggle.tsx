import { useSettings } from '../store/settings';

export function ChatCensorToggle({ compact = false }: { compact?: boolean }) {
  const enabled = useSettings((s) => s.chatCensor);
  const setChatCensor = useSettings((s) => s.setChatCensor);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      title={
        enabled
          ? 'Цензура включена. Нажмите, чтобы выключить у себя.'
          : 'Цензура выключена. Нажмите, чтобы включить.'
      }
      onClick={() => setChatCensor(!enabled)}
      className={`shrink-0 rounded-[6px] border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] transition-colors
        ${
          enabled
            ? 'border-brass-500/40 bg-brass-500/15 text-brass-300'
            : 'border-bone-50/10 text-bone-700 hover:border-bone-50/20 hover:text-bone-400'
        }`}
    >
      {compact ? (enabled ? 'Цензура' : 'Без цензуры') : enabled ? 'Цензура вкл' : 'Цензура выкл'}
    </button>
  );
}
