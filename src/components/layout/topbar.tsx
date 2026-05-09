'use client';

import { CaretDown } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

interface Advisor {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: 'advisor' | 'tenant_admin' | 'super_admin';
}

interface TopbarProps {
  advisor: Advisor;
  onOpenAssistant?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function Topbar({ advisor, onOpenAssistant, children, className }: TopbarProps) {
  return (
    <header
      className={cn(
        'flex h-14 items-center justify-between border-b border-border-subtle bg-canvas px-8',
        className,
      )}
    >
      <div className="flex items-center gap-4">
        {children && <h2 className="text-h2 text-primary">{children}</h2>}
      </div>

      <div className="flex items-center gap-6">
        {onOpenAssistant && (
          <button
            type="button"
            onClick={onOpenAssistant}
            className="flex items-center gap-2 text-body-sm text-tertiary hover:text-primary transition-colors"
          >
            <span>Anna</span>
            <kbd className="font-mono text-body-sm text-tertiary">⌘K</kbd>
          </button>
        )}
        <button
          type="button"
          className="flex items-center gap-1.5 text-body text-primary"
          title={advisor.email}
          aria-label={`Profil: ${advisor.full_name}`}
        >
          <span>{advisor.full_name}</span>
          <CaretDown size={14} weight="regular" />
        </button>
      </div>
    </header>
  );
}
