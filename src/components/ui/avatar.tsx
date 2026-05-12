import { cn } from '@/lib/cn';

interface AvatarProps {
  /** Plné jméno — generuje iniciály. */
  name: string;
  /** `sm` = 24px, `default` = 32px, `lg` = 40px. */
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-6 w-6 text-[10px]',
  default: 'h-8 w-8 text-[11px]',
  lg: 'h-10 w-10 text-[13px]',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

/**
 * Decentní iniciálový avatar. Subtle bg, ne wine ani accent — chceme
 * neutrální look (Apple Mail / Notes style).
 */
export function Avatar({ name, size = 'default', className }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-subtle font-medium text-secondary',
        sizeClasses[size],
        className,
      )}
      aria-label={name}
    >
      {getInitials(name)}
    </span>
  );
}
