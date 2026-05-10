'use client';

import { useState } from 'react';
import { ArrowUp, Microphone } from 'iconoir-react';
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
            placeholder="Zeptej se Anny nebo popiš co potřebuješ..."
            className="h-[72px] w-full rounded-2xl border border-border-subtle bg-surface px-7 pr-32 text-[18px] outline-none transition-all placeholder:text-tertiary focus:border-accent focus:ring-4 focus:ring-accent-muted"
          />
          <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
            <button
              type="button"
              aria-label="Nahrát hlasem"
              className="flex h-10 w-10 items-center justify-center rounded-full text-tertiary transition-colors hover:bg-subtle hover:text-primary"
            >
              <Microphone width={20} height={20} strokeWidth={1.5} />
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              aria-label="Odeslat"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-text transition-all hover:bg-accent-hover disabled:opacity-30"
            >
              <ArrowUp width={20} height={20} strokeWidth={2} />
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
