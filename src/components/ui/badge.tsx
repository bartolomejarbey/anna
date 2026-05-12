import { cn } from '@/lib/cn';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'accent' | 'quarter';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral:
    'bg-subtle text-secondary',
  success:
    'bg-[color-mix(in_oklab,_var(--color-success)_12%,_transparent)] text-[color-mix(in_oklab,_var(--color-success)_85%,_black)]',
  warning:
    'bg-[color-mix(in_oklab,_var(--color-warning)_14%,_transparent)] text-[color-mix(in_oklab,_var(--color-warning)_80%,_black)]',
  error:
    'bg-[color-mix(in_oklab,_var(--color-error)_12%,_transparent)] text-error',
  accent:
    'bg-accent-muted text-accent',
  quarter:
    'bg-subtle text-tertiary',
};

export function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
