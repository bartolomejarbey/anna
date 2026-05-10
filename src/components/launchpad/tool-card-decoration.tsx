import { cn } from '@/lib/cn';

interface DecorProps {
  className?: string;
}

const BASE = 'absolute -top-1 -right-1 pointer-events-none';

export function WaveDecor({ className }: DecorProps) {
  return (
    <svg
      aria-hidden
      className={cn(BASE, className)}
      width={96}
      height={96}
      viewBox="0 0 96 96"
      style={{ opacity: 0.20 }}
    >
      <path
        d="M-4 24 Q 12 12, 28 24 T 60 24 T 92 24"
        stroke="currentColor"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M-4 44 Q 12 32, 28 44 T 60 44 T 92 44"
        stroke="currentColor"
        fill="none"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M-4 64 Q 12 52, 28 64 T 60 64 T 92 64"
        stroke="currentColor"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M-4 84 Q 12 72, 28 84 T 60 84 T 92 84"
        stroke="currentColor"
        fill="none"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DotsDecor({ className }: DecorProps) {
  return (
    <svg
      aria-hidden
      className={cn(BASE, className)}
      width={96}
      height={96}
      viewBox="0 0 96 96"
      style={{ opacity: 0.22 }}
    >
      <circle cx="14" cy="14" r="2.4" fill="currentColor" />
      <circle cx="34" cy="14" r="2.4" fill="currentColor" />
      <circle cx="54" cy="14" r="2.4" fill="currentColor" />
      <circle cx="74" cy="14" r="2.4" fill="currentColor" />
      <circle cx="14" cy="34" r="2.4" fill="currentColor" />
      <circle cx="34" cy="34" r="2.4" fill="currentColor" />
      <circle cx="54" cy="34" r="2.4" fill="currentColor" />
      <circle cx="74" cy="34" r="2.4" fill="currentColor" />
      <circle cx="14" cy="54" r="2.4" fill="currentColor" />
      <circle cx="34" cy="54" r="2.4" fill="currentColor" />
      <circle cx="54" cy="54" r="2.4" fill="currentColor" />
      <circle cx="74" cy="54" r="2.4" fill="currentColor" />
      <circle cx="14" cy="74" r="2.4" fill="currentColor" />
      <circle cx="34" cy="74" r="2.4" fill="currentColor" />
      <circle cx="54" cy="74" r="2.4" fill="currentColor" />
      <circle cx="74" cy="74" r="2.4" fill="currentColor" />
    </svg>
  );
}

export function LinesDecor({ className }: DecorProps) {
  return (
    <svg
      aria-hidden
      className={cn(BASE, className)}
      width={96}
      height={96}
      viewBox="0 0 96 96"
      style={{ opacity: 0.22 }}
    >
      <line x1="0" y1="14" x2="96" y2="14" stroke="currentColor" strokeWidth="1.5" />
      <line x1="0" y1="28" x2="96" y2="28" stroke="currentColor" strokeWidth="1.5" />
      <line x1="0" y1="42" x2="96" y2="42" stroke="currentColor" strokeWidth="1.5" />
      <line x1="0" y1="56" x2="96" y2="56" stroke="currentColor" strokeWidth="1.5" />
      <line x1="0" y1="70" x2="96" y2="70" stroke="currentColor" strokeWidth="1.5" />
      <line x1="0" y1="84" x2="96" y2="84" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
