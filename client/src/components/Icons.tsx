import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconGear = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 14.5a1.6 1.6 0 0 0 .32 1.77l.06.06a1.9 1.9 0 1 1-2.7 2.7l-.05-.06a1.6 1.6 0 0 0-1.78-.32 1.6 1.6 0 0 0-.97 1.47v.17a1.9 1.9 0 1 1-3.82 0v-.09a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06a1.9 1.9 0 1 1-2.7-2.7l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97h-.17a1.9 1.9 0 1 1 0-3.82h.09a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a1.9 1.9 0 1 1 2.7-2.7l.06.06a1.6 1.6 0 0 0 1.77.32h.08A1.6 1.6 0 0 0 10.3 3.4v-.17a1.9 1.9 0 1 1 3.82 0v.09a1.6 1.6 0 0 0 .97 1.46 1.6 1.6 0 0 0 1.77-.32l.06-.06a1.9 1.9 0 1 1 2.7 2.7l-.06.06a1.6 1.6 0 0 0-.32 1.77v.08a1.6 1.6 0 0 0 1.47.97h.17a1.9 1.9 0 1 1 0 3.82h-.09a1.6 1.6 0 0 0-1.46.97Z" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const IconArrowLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </Svg>
);

export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12.5l5 5L20 6.5" />
  </Svg>
);

export const IconCamera = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.2-1.8a1 1 0 0 1 .83-.45h4.94a1 1 0 0 1 .83.45L16.5 6h2A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5Z" />
    <circle cx="12" cy="12.5" r="3.4" />
  </Svg>
);

export const IconCameraOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H8" />
    <path d="M21 16.5v-8A2.5 2.5 0 0 0 18.5 6h-2l-1.2-1.8a1 1 0 0 0-.83-.45H12" />
    <path d="M3 12v4.5A2.5 2.5 0 0 0 5.5 19h13c.4 0 .78-.09 1.12-.26" />
    <path d="M4 4l16 16" />
  </Svg>
);

export const IconMonitor = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="4.5" width="19" height="12.5" rx="2" />
    <path d="M9 20.5h6M12 17v3.5" />
  </Svg>
);

export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17 14.6a5.5 5.5 0 0 1 3.5 4.9" />
  </Svg>
);

export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 13.4A8.2 8.2 0 0 1 10.6 4a8.2 8.2 0 1 0 9.4 9.4Z" />
  </Svg>
);

export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
  </Svg>
);

export const IconGavel = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.5 4.2l6.3 6.3M16.6 1.1l6.3 6.3M18.1 2.6l-4.7 4.7M21.2 5.7l-4.7 4.7" transform="translate(-2 1)" />
    <path d="M11 8.5L4.2 15.3a2.4 2.4 0 0 0 3.4 3.4l6.8-6.8" />
    <path d="M3 21.5h9" />
  </Svg>
);

export const IconTrophy = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7.5 3.5h9v5a4.5 4.5 0 0 1-9 0Z" />
    <path d="M7.5 5.5H5a2 2 0 0 0 2.5 3M16.5 5.5H19a2 2 0 0 1-2.5 3" />
    <path d="M12 13v3.5M8.8 20.5h6.4M9.8 16.5h4.4l1 4H8.8Z" />
  </Svg>
);

export const IconMic = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);

export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4.8v14.4l12-7.2Z" />
  </Svg>
);

export const IconLink = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.5 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1.7 1.7" />
    <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.7-1.7" />
  </Svg>
);

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.8l7.5 3v6.4c0 4.6-3.1 7.9-7.5 9.3-4.4-1.4-7.5-4.7-7.5-9.3V5.8Z" />
  </Svg>
);

export const IconSend = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.5 3.5 3.8 10.2a.5.5 0 0 0 .04.94l6.6 1.9 1.9 6.6a.5.5 0 0 0 .94.04Z" />
    <path d="M10.6 13.4 20.5 3.5" />
  </Svg>
);

export const IconScroll = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6" />
    <path d="M4 6a2 2 0 0 1 4 0v2H4Z" />
    <path d="M10 9h7M10 13h7M10 17h4" />
  </Svg>
);

export const IconSkull = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3c-4.4 0-7.5 3-7.5 7 0 2.4 1.1 3.9 2.3 4.9.5.4.7.9.7 1.5v1.1a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5v-1.1c0-.6.2-1.1.7-1.5 1.2-1 2.3-2.5 2.3-4.9 0-4-3.1-7-7.5-7Z" />
    <circle cx="9.3" cy="11" r="1.4" />
    <circle cx="14.7" cy="11" r="1.4" />
    <path d="M10.5 19v2M13.5 19v2" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </Svg>
);

export const IconBan = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M6 6l12 12" />
  </Svg>
);

export const IconRobot = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="8" width="16" height="11" rx="3" />
    <path d="M12 4.5V8" />
    <circle cx="12" cy="3.6" r="1.1" />
    <circle cx="9" cy="13" r="1.2" />
    <circle cx="15" cy="13" r="1.2" />
    <path d="M9.5 16.4h5M1.8 12v3M22.2 12v3" />
  </Svg>
);

export const IconExit = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 16l-4-4 4-4M6 12h9" />
  </Svg>
);

export const IconSpinner = ({ size = 20, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 12 12"
        to="360 12 12"
        dur="0.9s"
        repeatCount="indefinite"
      />
    </path>
  </svg>
);

/* ── Role emblems ───────────────────────────────────────────── */

export const EmblemCivilian = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 20.5V10L12 3.5l8.5 6.5v10.5" />
    <path d="M2 20.5h20" />
    <path d="M9.5 20.5v-5.2h5v5.2" />
    <path d="M10 10.5h4" />
  </Svg>
);

export const EmblemMafia = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 13V8.6C7 6.6 8.6 5 10.6 5h2.8C15.4 5 17 6.6 17 8.6V13" />
    <path d="M2.5 13.6c0 2 4.3 3.6 9.5 3.6s9.5-1.6 9.5-3.6" />
    <path d="M2.5 13.6c0-1 3-1.8 5.5-1.9M21.5 13.6c0-1-3-1.8-5.5-1.9" />
    <path d="M7 9.6h10" />
  </Svg>
);

export const EmblemDon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 13V8.6C7 6.6 8.6 5 10.6 5h2.8C15.4 5 17 6.6 17 8.6V13" />
    <path d="M2.5 13.6c0 2 4.3 3.6 9.5 3.6s9.5-1.6 9.5-3.6" />
    <path d="M2.5 13.6c0-1 3-1.8 5.5-1.9M21.5 13.6c0-1-3-1.8-5.5-1.9" />
    <path d="M7 9.6h10" />
    <path d="M12 8.1l.9 1.9M12 8.1l-.9 1.9" opacity="0" />
    <path d="M12 7.7l1.05 2.1-2.1 0Z" fill="currentColor" stroke="none" />
  </Svg>
);

export const EmblemSheriff = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 6.1l1.75 3.62 3.95.55-2.87 2.8.69 3.98L12 15.16l-3.52 1.89.69-3.98-2.87-2.8 3.95-.55Z" />
  </Svg>
);

export const EmblemDoctor = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.8l7.5 3v6.4c0 4.6-3.1 7.9-7.5 9.3-4.4-1.4-7.5-4.7-7.5-9.3V5.8Z" />
    <path d="M12 8v6.4M8.8 11.2h6.4" />
  </Svg>
);

export const ROLE_EMBLEMS = {
  civilian: EmblemCivilian,
  mafia: EmblemMafia,
  don: EmblemDon,
  sheriff: EmblemSheriff,
  doctor: EmblemDoctor,
} as const;

/* ── Decorative ─────────────────────────────────────────────── */

export function Ornament({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 12" className={className} fill="none" aria-hidden="true">
      <path d="M0 6h44" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <path d="M76 6h44" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <path d="M60 1.6l4.2 4.4-4.2 4.4-4.2-4.4Z" stroke="currentColor" strokeWidth="1" />
      <path d="M50.5 6h3M66.5 6h3" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

export function CardBackPattern({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 300" className={className} fill="none" aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <pattern id="diag" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.16" />
        </pattern>
      </defs>
      <rect width="200" height="300" fill="url(#diag)" />
      <rect x="12" y="12" width="176" height="276" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <rect x="18" y="18" width="164" height="264" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
    </svg>
  );
}
