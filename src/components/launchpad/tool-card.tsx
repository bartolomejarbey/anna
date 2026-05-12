'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';

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

const ICON_TONE: Record<ToolVariant, string> = {
  featured: 'text-accent bg-accent-muted',
  growth: 'text-primary bg-subtle',
  value: 'text-primary bg-subtle',
  neutral: 'text-primary bg-subtle',
  disabled: 'text-tertiary bg-subtle',
};

export function ToolCard({
  title,
  description,
  icon,
  href,
  onClick,
  variant = 'neutral',
  badge,
}: ToolCardProps) {
  const isDisabled = variant === 'disabled';

  const wrapperClass = cn(
    'group relative flex h-full w-full flex-col gap-4 rounded-[18px] border border-border-subtle bg-surface p-6 text-left transition-all duration-200',
    isDisabled
      ? 'opacity-55 cursor-default'
      : 'cursor-pointer hover:border-border-default hover:-translate-y-0.5',
  );

  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-[12px]',
            ICON_TONE[variant],
          )}
          aria-hidden
        >
          <div className="h-6 w-6">{icon}</div>
        </div>
        {badge ? (
          <span className="inline-flex items-center rounded-full bg-subtle px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-tertiary">
            {badge}
          </span>
        ) : null}
      </div>

      <div>
        <h3 className={cn('text-h3', isDisabled ? 'text-secondary' : 'text-primary')}>
          {title}
        </h3>
        <p className={cn('mt-1 text-body-sm', isDisabled ? 'text-tertiary' : 'text-secondary')}>
          {description}
        </p>
      </div>
    </>
  );

  if (isDisabled) {
    return <div className={wrapperClass}>{inner}</div>;
  }

  if (href) {
    return (
      <Link href={href} className={wrapperClass}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={wrapperClass}>
      {inner}
    </button>
  );
}
