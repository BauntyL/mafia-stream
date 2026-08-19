import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'brass' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
}

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-[7px] font-medium ' +
  'transition-[background,border-color,color,transform,box-shadow] duration-200 ease-out ' +
  'select-none disabled:pointer-events-none disabled:opacity-35 active:translate-y-px';

const variants: Record<string, string> = {
  primary:
    'text-bone-50 bg-blood-600 border border-blood-500/70 ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_24px_-14px_rgba(184,50,61,0.9)] ' +
    'hover:bg-blood-500 hover:border-blood-400/80',
  secondary:
    'text-bone-200 bg-bone-50/[0.045] border border-bone-50/12 ' +
    'hover:bg-bone-50/[0.085] hover:border-bone-50/20 hover:text-bone-50',
  ghost:
    'text-bone-400 border border-transparent hover:text-bone-50 hover:bg-bone-50/[0.06]',
  brass:
    'text-ink-1000 bg-brass-400 border border-brass-300 font-semibold ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_24px_-14px_rgba(207,174,82,0.8)] ' +
    'hover:bg-brass-300',
  danger:
    'text-blood-300 bg-blood-900/40 border border-blood-700/60 hover:bg-blood-900/70 hover:text-blood-200',
};

const sizes: Record<string, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-7 text-[15px] tracking-[0.06em] uppercase font-semibold',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({ label, children, className = '', ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-[7px] text-bone-400
        border border-transparent transition-colors duration-200
        hover:text-bone-50 hover:bg-bone-50/[0.06] hover:border-bone-50/10
        disabled:opacity-35 disabled:pointer-events-none ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
