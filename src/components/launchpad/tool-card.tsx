'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';

interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  featured?: boolean;
  disabled?: boolean;
  badge?: string;
}

export function ToolCard({
  title,
  description,
  icon,
  href,
  onClick,
  featured,
  disabled,
  badge,
}: ToolCardProps) {
  const wrapperClass = cn(
    'group relative flex h-[200px] w-full flex-col p-7 rounded-[16px] border border-border-subtle text-left transition-all duration-200',
    !disabled && featured && 'bg-accent-muted',
    !disabled && !featured && 'bg-surface',
    disabled && 'bg-subtle opacity-60 cursor-default',
    !disabled && 'cursor-pointer hover:border-accent hover:-translate-y-[1px]',
  );

  const titleClass = cn(
    'text-h3 tracking-tight',
    disabled ? 'text-secondary' : 'text-primary',
  );

  const descClass = cn(
    'mt-2 text-body-sm line-clamp-2',
    disabled ? 'text-tertiary' : 'text-secondary',
  );

  const iconWrapperClass = cn(
    'h-12 w-12',
    disabled ? 'text-tertiary' : 'text-accent',
  );

  const inner = (
    <>
      <div className={iconWrapperClass}>{icon}</div>
      <div className="mt-6">
        <h3 className={titleClass}>{title}</h3>
        <p className={descClass}>{description}</p>
      </div>
      {badge && (
        <span
          className="absolute right-6 top-6 inline-flex items-center rounded-full bg-accent-muted px-2 py-0.5 font-medium text-accent"
          style={{ fontSize: 11, letterSpacing: '0.04em' }}
        >
          {badge}
        </span>
      )}
    </>
  );

  if (disabled) {
    return (
      <div className={wrapperClass} aria-disabled="true">
        {inner}
      </div>
    );
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
