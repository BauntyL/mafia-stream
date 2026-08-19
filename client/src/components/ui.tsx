import type { InputHTMLAttributes, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconClose, IconCheck } from './Icons';

/* ── Modal ──────────────────────────────────────────────────── */

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  closable?: boolean;
  width?: string;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  closable = true,
  width = 'max-w-[420px]',
}: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <motion.div
            className="absolute inset-0 bg-ink-1000/85 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closable ? onClose : undefined}
          />
          <motion.div
            className={`relative w-full ${width} rounded-[12px] border border-bone-50/10
              bg-ink-900 shadow-[0_40px_90px_-30px_rgba(0,0,0,1)]`}
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
              <div>
                <h2 className="font-display text-[22px] leading-tight text-bone-50">{title}</h2>
                {subtitle && <p className="mt-1 text-[13px] text-bone-600">{subtitle}</p>}
              </div>
              {closable && onClose && (
                <button
                  onClick={onClose}
                  aria-label="Закрыть"
                  className="-mr-1 -mt-1 rounded p-1.5 text-bone-600 transition-colors hover:text-bone-50"
                >
                  <IconClose size={18} />
                </button>
              )}
            </div>
            <div className="rule" />
            <div className="px-6 pt-5 pb-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ── Panel ──────────────────────────────────────────────────── */

export function Panel({
  children,
  className = '',
  title,
  action,
  accent,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
  accent?: 'brass' | 'blood';
}) {
  const accentBorder =
    accent === 'brass'
      ? 'border-brass-500/25'
      : accent === 'blood'
        ? 'border-blood-600/30'
        : '';

  return (
    <section className={`panel ${accentBorder} ${className}`}>
      {title && (
        <>
          <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
            <h3 className="eyebrow">{title}</h3>
            {action}
          </header>
          <div className="rule" />
        </>
      )}
      <div className={title ? 'p-5' : 'p-5'}>{children}</div>
    </section>
  );
}

/* ── Input ──────────────────────────────────────────────────── */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ className = '', invalid, ...props }: InputProps) {
  return (
    <input
      className={`h-11 w-full rounded-[7px] border bg-ink-1000/60 px-3.5 text-[15px] text-bone-50
        placeholder:text-bone-700 transition-colors duration-200
        focus:outline-none focus:ring-0
        ${invalid ? 'border-blood-500/70' : 'border-bone-50/12 focus:border-bone-50/30'}
        ${className}`}
      {...props}
    />
  );
}

/* ── Toggle ─────────────────────────────────────────────────── */

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between gap-4 text-left disabled:opacity-40"
    >
      <span>
        <span className="block text-sm text-bone-200">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-bone-700">{hint}</span>}
      </span>
      <span
        className={`relative h-[22px] w-[38px] shrink-0 rounded-full border transition-colors duration-200
          ${checked ? 'border-brass-500/60 bg-brass-500/30' : 'border-bone-50/12 bg-ink-1000'}`}
      >
        <motion.span
          className={`absolute top-[3px] h-[14px] w-[14px] rounded-full
            ${checked ? 'bg-brass-300' : 'bg-bone-600'}`}
          animate={{ left: checked ? 19 : 3 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </span>
    </button>
  );
}

/* ── Chip / Badge ───────────────────────────────────────────── */

export function Badge({
  children,
  tone = 'neutral',
  icon,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brass' | 'blood' | 'sage';
  icon?: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: 'text-bone-400 border-bone-50/12 bg-bone-50/[0.04]',
    brass: 'text-brass-300 border-brass-500/30 bg-brass-500/10',
    blood: 'text-blood-300 border-blood-600/40 bg-blood-900/30',
    sage: 'text-sage-400 border-sage-600/40 bg-sage-600/12',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px]
        text-[11px] font-medium tracking-[0.04em] ${tones[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

/* ── Field label ────────────────────────────────────────────── */

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="eyebrow mb-2 block">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-bone-700">{hint}</span>}
    </label>
  );
}

/* ── Copy field ─────────────────────────────────────────────── */

export function CopyRow({
  value,
  onCopy,
  copied,
}: {
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-[7px] border border-bone-50/12 bg-ink-1000/60">
      <span className="flex-1 truncate px-3 py-2.5 font-mono text-[12px] text-bone-400">{value}</span>
      <button
        onClick={onCopy}
        className="flex items-center gap-1.5 border-l border-bone-50/10 px-3 text-[12px]
          text-bone-400 transition-colors hover:bg-bone-50/[0.06] hover:text-bone-50"
      >
        {copied ? <IconCheck size={14} /> : null}
        {copied ? 'Готово' : 'Копировать'}
      </button>
    </div>
  );
}
