'use client';

import { useEffect } from 'react';
import { X } from '@phosphor-icons/react';
import { AiAsistentChat } from '@/components/ai-asistent-chat';
import { cn } from '@/lib/cn';

interface AiAsistentRailProps {
  open: boolean;
  onClose: () => void;
}

export function AiAsistentRail({ open, onClose }: AiAsistentRailProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/10 transition-opacity',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        style={{ transitionDuration: '200ms', transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
      />
      <aside
        aria-hidden={!open}
        aria-label="Anna asistent"
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-[380px] flex-col border-l border-border-subtle bg-canvas',
          'transition-transform',
        )}
        style={{
          transitionDuration: '250ms',
          transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        <div className="flex h-14 items-center justify-between border-b border-border-subtle px-6">
          <span className="text-body-sm text-tertiary">Anna</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zavřít"
            className="text-tertiary hover:text-primary transition-colors"
          >
            <X size={18} weight="regular" />
          </button>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <AiAsistentChat />
        </div>
      </aside>
    </>
  );
}
