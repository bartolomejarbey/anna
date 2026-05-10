import { cn } from '@/lib/cn';

interface CornerAccentProps {
  position: 'tl' | 'tr' | 'bl' | 'br';
  className?: string;
}

const POSITION: Record<CornerAccentProps['position'], string> = {
  tl: 'top-6 left-6',
  tr: 'top-6 right-6',
  bl: 'bottom-6 left-6',
  br: 'bottom-6 right-6',
};

export function CornerAccent({ position, className }: CornerAccentProps) {
  const isTop = position === 'tl' || position === 'tr';
  const isLeft = position === 'tl' || position === 'bl';

  return (
    <div
      aria-hidden
      className={cn('anna-corner-accent', POSITION[position], className)}
    >
      <svg width={56} height={56} viewBox="0 0 56 56" fill="none">
        {/* cross glyph */}
        <line
          x1={isLeft ? 4 : 36}
          y1={isTop ? 12 : 44}
          x2={isLeft ? 20 : 52}
          y2={isTop ? 12 : 44}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1={isLeft ? 12 : 44}
          y1={isTop ? 4 : 36}
          x2={isLeft ? 12 : 44}
          y2={isTop ? 20 : 52}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* paired dashes */}
        <line
          x1={isLeft ? 28 : 4}
          y1={isTop ? 28 : 12}
          x2={isLeft ? 36 : 12}
          y2={isTop ? 28 : 12}
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <line
          x1={isLeft ? 28 : 4}
          y1={isTop ? 34 : 18}
          x2={isLeft ? 34 : 10}
          y2={isTop ? 34 : 18}
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
