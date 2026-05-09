'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MessageSquare, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const HINT_CHIPS = [
  'Shrň schůzku s panem Novákem',
  'Co se obvykle ptám u nového klienta?',
  'Navrhni e-mail po schůzce',
];

function useAutoGrowTextarea(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);
  return ref;
}

export function AiAsistentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useAutoGrowTextarea(input);

  // Auto-scroll to bottom whenever messages change or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    setError(null);
    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);

    const history: ChatMessage[] = [...messages, userMsg];

    try {
      const response = await fetch('/api/ai-asistent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch {
      setError('Něco se pokazilo. Zkuste to prosím znovu.');
      // Remove the empty assistant placeholder on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Message list or empty state */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center pb-4">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-border-subtle bg-bg-tertiary">
              <MessageSquare className="h-4 w-4 text-text-tertiary" />
            </div>
            <h3 className="text-[15px] font-semibold text-text-primary">Anna</h3>
            <p className="mt-1.5 max-w-[220px] text-center text-[13px] text-text-secondary">
              Zeptejte se na cokoliv k vašim schůzkám, zákazníkům nebo finančním produktům.
            </p>
            <div className="mt-5 flex flex-col gap-2 w-full">
              {HINT_CHIPS.map((hint) => (
                <button
                  key={hint}
                  onClick={() => setInput(hint)}
                  className="rounded-lg border border-border-subtle bg-bg-tertiary px-3 py-2 text-left text-[13px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
              />
            ))}
            {error && (
              <p className="text-[13px] text-error px-1">{error}</p>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border-subtle px-4 py-3">
        {error && messages.length === 0 && (
          <p className="mb-2 text-[13px] text-error">{error}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="Napište zprávu…"
            rows={1}
            className={cn(
              'flex-1 resize-none overflow-hidden rounded-lg border border-border-subtle bg-bg-tertiary',
              'px-3 py-2.5 text-[14px] text-text-primary placeholder:text-text-tertiary',
              'focus:outline-none focus:border-accent transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'min-h-[40px]',
            )}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={isStreaming || !input.trim()}
            className="h-10 w-10 shrink-0 rounded-xl"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming: boolean;
}

function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent">
          <span className="text-[10px] font-semibold text-bg-primary">A</span>
        </div>
      )}
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
          'border border-border-subtle whitespace-pre-wrap',
          isUser ? 'bg-bg-tertiary text-text-primary' : 'bg-bg-primary text-text-primary',
        )}
      >
        {message.content}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-2 w-2 animate-pulse rounded-full bg-text-tertiary align-middle" />
        )}
      </div>
    </div>
  );
}
