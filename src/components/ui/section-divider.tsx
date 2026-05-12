import { cn } from '@/lib/cn';

interface SectionDividerProps {
  /** Velikost vertikálního dechu. `default` = 80px / md:96px. `lg` = 96/128. */
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

const sizeClasses: Record<NonNullable<SectionDividerProps['size']>, string> = {
  sm: 'my-10 md:my-12',
  default: 'my-20 md:my-24',
  lg: 'my-24 md:my-32',
};

/**
 * Jednoduchá vodorovná čára mezi sekcemi.
 * Nemá obsah — jen border-t + spacing. Pro labelované sekce použij SectionFrame.
 */
export function SectionDivider({ size = 'default', className }: SectionDividerProps) {
  return (
    <div className={cn('border-t border-border-subtle', sizeClasses[size], className)} />
  );
}
