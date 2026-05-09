import { cn } from '@/lib/cn';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'quarter';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral:
    'border border-border-subtle bg-subtle text-secondary',
  success:
    'border border-[color-mix(in_oklab,_var(--color-success)_30%,_transparent)] bg-[color-mix(in_oklab,_var(--color-success)_10%,_transparent)] text-success',
  warning:
    'border border-[color-mix(in_oklab,_var(--color-warning)_30%,_transparent)] bg-[color-mix(in_oklab,_var(--color-warning)_10%,_transparent)] text-warning',
  error:
    'border border-[color-mix(in_oklab,_var(--color-error)_30%,_transparent)] bg-[color-mix(in_oklab,_var(--color-error)_10%,_transparent)] text-error',
  quarter:
    'border border-border-subtle bg-subtle text-secondary',
};

export function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-caption',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
