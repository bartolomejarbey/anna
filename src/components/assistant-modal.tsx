'use client';

import { useEffect } from 'react';
import { Xmark } from 'iconoir-react';
import { AiAsistentChat } from '@/components/ai-asistent-chat';
import { useAssistant } from '@/components/launchpad/assistant-context';

export function AssistantModal() {
  const { open, closeAssistant } = useAssistant();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAssistant();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeAssistant]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Asistent Anna">
      <div
        aria-hidden
        onClick={closeAssistant}
        className="absolute inset-0 bg-black/15"
      />
      <div className="anna-fade-scale-in relative flex h-[640px] w-[640px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] flex-col overflow-hidden rounded-[16px] border border-border-default bg-surface">
        <div className="flex h-14 items-center justify-between border-b border-border-subtle px-6">
          <span className="text-caption text-tertiary">Anna</span>
          <button
            type="button"
            onClick={closeAssistant}
            aria-label="Zavřít"
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-tertiary transition-colors hover:bg-subtle hover:text-primary"
          >
            <Xmark width={18} height={18} strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <AiAsistentChat />
        </div>
      </div>
    </div>
  );
}
