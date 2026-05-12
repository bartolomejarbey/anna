'use client';

import { useEffect } from 'react';
import { X } from '@phosphor-icons/react';
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
        className="absolute inset-0 bg-black/20"
      />
      <div className="anna-fade-scale-in relative flex h-[640px] w-[640px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] flex-col overflow-hidden rounded-[14px] border border-border-subtle bg-surface shadow-[0_24px_64px_rgba(0,0,0,0.16)]">
        <div className="flex h-14 items-center justify-between border-b border-border-subtle px-5">
          <span className="text-body-sm font-medium text-primary">Asistent</span>
          <button
            type="button"
            onClick={closeAssistant}
            aria-label="Zavřít"
            className="flex h-8 w-8 items-center justify-center rounded-full text-tertiary transition-colors hover:bg-subtle hover:text-primary"
          >
            <X size={16} weight="regular" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <AiAsistentChat />
        </div>
      </div>
    </div>
  );
}
