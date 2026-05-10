import { cn } from '@/lib/cn';

type Size = 'sm' | 'md' | 'lg' | 'hero';

interface AnnaWordmarkProps {
  size?: Size;
  animate?: boolean;
  interactive?: boolean;
  className?: string;
}

const SIZE_CONFIG: Record<Size, { fontSize: string; gap: string }> = {
  sm: { fontSize: 'text-[20px]', gap: 'gap-[3px]' },
  md: { fontSize: 'text-[28px]', gap: 'gap-[4px]' },
  lg: { fontSize: 'text-[48px]', gap: 'gap-[6px]' },
  hero: { fontSize: 'text-[96px]', gap: 'gap-[10px]' },
};

export function AnnaWordmark({
  size = 'md',
  animate = false,
  interactive = false,
  className,
}: AnnaWordmarkProps) {
  const cfg = SIZE_CONFIG[size];
  return (
    <span
      className={cn(
        'inline-flex flex-col items-start leading-none',
        cfg.gap,
        interactive && 'anna-wordmark-link',
        className,
      )}
      aria-label="Anna"
    >
      <span aria-hidden className={cn('text-wordmark text-primary', cfg.fontSize)}>
        Anna
      </span>
      <span aria-hidden className={cn('anna-underline', animate && 'anna-underline--animate')} />
    </span>
  );
}
