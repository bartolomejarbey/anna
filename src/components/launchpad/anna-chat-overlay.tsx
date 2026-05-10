'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Xmark, ArrowUp, Microphone } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { AnnaWordmark } from '@/components/brand/anna-wordmark';

interface ChatMessage {
  role: 'user' | 'anna';
  text: string;
  isLoading?: boolean;
}

interface AnnaChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export function AnnaChatOverlay({ isOpen, onClose, initialMessage }: AnnaChatOverlayProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 top-16 z-50 flex flex-col overflow-hidden rounded-t-3xl border-t border-border-subtle bg-canvas shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border-subtle px-8 py-5">
              <AnnaWordmark size="sm" />
              <button
                onClick={onClose}
                aria-label="Zavřít"
                className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-subtle"
              >
                <Xmark width={20} height={20} strokeWidth={1.5} />
              </button>
            </div>
            <MessagesPane initialMessage={initialMessage} />
            <div className="border-t border-border-subtle bg-canvas px-8 py-6">
              <div className="relative mx-auto max-w-[800px]">
                <input
                  type="text"
                  placeholder="Pokračuj v rozhovoru..."
                  className="h-[60px] w-full rounded-2xl border border-border-subtle bg-surface px-6 pr-28 text-[16px] outline-none transition-all focus:border-accent"
                />
                <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
                  <button
                    aria-label="Nahrát hlasem"
                    className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-subtle"
                  >
                    <Microphone width={18} height={18} strokeWidth={1.5} />
                  </button>
                  <button
                    aria-label="Odeslat"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-text"
                  >
                    <ArrowUp width={18} height={18} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MessagesPane({ initialMessage }: { initialMessage?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialMessage
      ? [
          { role: 'user', text: initialMessage },
          { role: 'anna', text: 'Anna přemýšlí...', isLoading: true },
        ]
      : []
  );

  useEffect(() => {
    if (!initialMessage) return;
    const t = setTimeout(() => {
      setMessages((prev) => [
        prev[0],
        {
          role: 'anna',
          text: 'Tato funkcionalita bude dostupná v plné verzi. Tady by Anna odpovídala na dotaz nebo otevřela příslušný nástroj.',
        },
      ]);
    }, 1500);
    return () => clearTimeout(t);
  }, [initialMessage]);

  return (
    <div className="mx-auto w-full max-w-[800px] flex-1 overflow-y-auto px-8 py-12">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`mb-8 ${msg.role === 'user' ? 'flex justify-end' : ''}`}
        >
          <div
            className={
              msg.role === 'user'
                ? 'max-w-[70%] rounded-2xl bg-accent px-5 py-3 text-accent-text'
                : 'max-w-[72ch] text-[18px] leading-[1.6] text-primary'
            }
          >
            {msg.isLoading ? (
              <span className="italic text-tertiary">{msg.text}</span>
            ) : (
              msg.text
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
