'use client';

import { useState } from 'react';
import { ArrowUp, Microphone } from '@phosphor-icons/react';
import { AnnaChatOverlay } from './anna-chat-overlay';

export function AnnaPromptInput() {
  const [value, setValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value.trim()) return;
    setIsOpen(true);
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Zeptej se Anny..."
            className="h-14 w-full rounded-full border border-border-subtle bg-surface pl-6 pr-28 text-body-lg text-primary outline-none transition-all placeholder:text-tertiary focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            <button
              type="button"
              aria-label="Nahrát hlasem"
              className="flex h-10 w-10 items-center justify-center rounded-full text-tertiary transition-colors hover:bg-subtle hover:text-primary"
            >
              <Microphone size={18} weight="regular" />
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              aria-label="Odeslat"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-text transition-all hover:bg-accent-hover disabled:opacity-30"
            >
              <ArrowUp size={18} weight="bold" />
            </button>
          </div>
        </div>
      </form>
      <AnnaChatOverlay
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialMessage={value}
      />
    </>
  );
}
