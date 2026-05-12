import { cn } from '@/lib/cn';

type StatusTone = 'neutral' | 'success' | 'warning' | 'error' | 'accent' | 'processing';

interface StatusPillProps {
  tone?: StatusTone;
  /** Volitelně zobrazit dot vlevo. */
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

const toneClasses: Record<StatusTone, string> = {
  neutral: 'bg-subtle text-secondary',
  success:
    'bg-[color-mix(in_oklab,_var(--color-success)_12%,_transparent)] text-[color-mix(in_oklab,_var(--color-success)_85%,_black)]',
  warning:
    'bg-[color-mix(in_oklab,_var(--color-warning)_14%,_transparent)] text-[color-mix(in_oklab,_var(--color-warning)_80%,_black)]',
  error:
    'bg-[color-mix(in_oklab,_var(--color-error)_12%,_transparent)] text-error',
  accent: 'bg-accent-muted text-accent',
  processing: 'bg-accent-muted text-accent',
};

const dotClasses: Record<StatusTone, string> = {
  neutral: 'bg-tertiary',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  accent: 'bg-accent',
  processing: 'bg-accent',
};

/**
 * Status pill — pro stavy schůzek, zákazníků, plánů.
 * Větší než Badge, čitelnější, lépe vypadá v list views.
 */
export function StatusPill({ tone = 'neutral', dot, className, children }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-body-sm font-medium',
        toneClasses[tone],
        className,
      )}
    >
      {dot ? (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            dotClasses[tone],
            tone === 'processing' ? 'anna-recording-pulse' : '',
          )}
        />
      ) : null}
      {children}
    </span>
  );
}
