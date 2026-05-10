'use client';

import Link from 'next/link';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';
import {
  WaveDecor,
  DotsDecor,
  LinesDecor,
} from './tool-card-decoration';

export type ToolVariant = 'featured' | 'growth' | 'value' | 'neutral' | 'disabled';

interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: ToolVariant;
  badge?: string;
}

const VARIANT_BG: Record<ToolVariant, string> = {
  featured: 'bg-accent-muted',
  growth: 'bg-[var(--color-sage-bg)]',
  value: 'bg-[var(--color-ochre-bg)]',
  neutral: 'bg-surface',
  disabled: 'bg-subtle',
};

const VARIANT_LINE: Record<ToolVariant, string> = {
  featured: 'bg-accent',
  growth: 'bg-[var(--color-warmbrown)]',
  value: 'bg-[var(--color-warmbrown)]',
  neutral: 'bg-border-default',
  disabled: 'bg-border-subtle',
};

const VARIANT_ICON: Record<ToolVariant, string> = {
  featured: 'text-accent',
  growth: 'text-accent',
  value: 'text-accent',
  neutral: 'text-accent',
  disabled: 'text-tertiary',
};

const VARIANT_DECOR_COLOR: Record<ToolVariant, string> = {
  featured: 'text-accent',
  growth: 'text-[var(--color-sage)]',
  value: 'text-[var(--color-ochre)]',
  neutral: 'text-[var(--color-warmbrown)]',
  disabled: 'text-tertiary',
};

const MAGNET_RANGE = 6;
const SPRING = { stiffness: 200, damping: 15, mass: 0.5 };

const MotionLink = motion.create(Link);

export function ToolCard({
  title,
  description,
  icon,
  href,
  onClick,
  variant = 'neutral',
  badge,
}: ToolCardProps) {
  const reducedMotion = useReducedMotion();
  const isDisabled = variant === 'disabled';

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, SPRING);
  const sy = useSpring(y, SPRING);

  const handleMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reducedMotion || isDisabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    x.set(dx * MAGNET_RANGE);
    y.set(dy * MAGNET_RANGE);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  const wrapperClass = cn(
    'group relative flex h-[200px] w-full flex-col overflow-hidden p-7 rounded-[16px] border border-border-subtle text-left transition-[border-color] duration-200',
    VARIANT_BG[variant],
    isDisabled
      ? 'opacity-60 cursor-default'
      : 'cursor-pointer hover:border-accent',
  );

  const lineOpacity = isDisabled ? 'opacity-100' : variant === 'neutral' ? 'opacity-60' : 'opacity-40';

  const titleClass = cn(
    'text-h3 tracking-tight',
    isDisabled ? 'text-secondary' : 'text-primary',
  );

  const descClass = cn(
    'mt-2 text-body-sm line-clamp-2',
    isDisabled ? 'text-tertiary' : 'text-secondary',
  );

  const iconWrapperClass = cn('h-12 w-12 relative z-[1]', VARIANT_ICON[variant]);

  const Decor = (() => {
    switch (variant) {
      case 'featured':
        return <WaveDecor className={VARIANT_DECOR_COLOR.featured} />;
      case 'growth':
        return <DotsDecor className={VARIANT_DECOR_COLOR.growth} />;
      case 'value':
        return <LinesDecor className={VARIANT_DECOR_COLOR.value} />;
      default:
        return null;
    }
  })();

  const inner = (
    <>
      <span
        aria-hidden
        className={cn('absolute inset-x-0 top-0 h-[1.5px]', VARIANT_LINE[variant], lineOpacity)}
      />
      {Decor}
      <div className={iconWrapperClass}>{icon}</div>
      <div className="mt-6 relative z-[1]">
        <h3 className={titleClass}>{title}</h3>
        <p className={descClass}>{description}</p>
      </div>
      {badge && (
        <span
          className="absolute right-6 top-6 inline-flex items-center rounded-full bg-[var(--color-warmbrown-bg)] px-2.5 py-0.5 font-medium text-secondary z-[1]"
          style={{ fontSize: 11, letterSpacing: '0.04em' }}
        >
          {badge}
        </span>
      )}
    </>
  );

  if (isDisabled) {
    return <div className={wrapperClass}>{inner}</div>;
  }

  const motionStyle = reducedMotion ? undefined : { x: sx, y: sy };

  if (href) {
    return (
      <MotionLink
        href={href}
        className={wrapperClass}
        style={motionStyle}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        {inner}
      </MotionLink>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={wrapperClass}
      style={motionStyle}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {inner}
    </motion.button>
  );
}
