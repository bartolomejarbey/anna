'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowUp } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function useAutoGrowTextarea(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
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
      setError('Něco vázne. Zkus to znovu.');
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
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {messages.length === 0 ? (
          <div className="h-full" />
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
              />
            ))}
            {error && <p className="text-body-sm text-error px-1">{error}</p>}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border-subtle px-4 py-3">
        {error && messages.length === 0 && (
          <p className="mb-2 text-body-sm text-error">{error}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="Zeptej se."
            rows={1}
            className={cn(
              'flex-1 resize-none overflow-hidden rounded-[8px] border border-border-subtle bg-surface',
              'px-3 py-2.5 text-body text-primary placeholder:text-tertiary',
              'focus:outline-none focus:border-accent transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'min-h-[40px]',
            )}
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={isStreaming || !input.trim()}
            aria-label="Odeslat"
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px]',
              'bg-accent text-accent-text transition-opacity',
              'hover:opacity-90 active:scale-[0.98]',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            <ArrowUp size={16} weight="regular" />
          </button>
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
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] px-3 py-2 text-body whitespace-pre-wrap',
          isUser
            ? 'rounded-[8px] bg-subtle text-primary'
            : 'text-primary',
        )}
      >
        {message.content}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-2 w-2 animate-pulse rounded-full bg-tertiary align-middle" />
        )}
      </div>
    </div>
  );
}
