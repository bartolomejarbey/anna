'use client';

import { createContext, useCallback, useContext, useState } from 'react';

interface AssistantContextValue {
  open: boolean;
  prefilledQuery: string;
  openAssistant: (query?: string) => void;
  closeAssistant: () => void;
}

const Ctx = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [prefilledQuery, setPrefilledQuery] = useState('');

  const openAssistant = useCallback((query?: string) => {
    setPrefilledQuery(query ?? '');
    setOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setOpen(false);
    setPrefilledQuery('');
  }, []);

  return (
    <Ctx.Provider value={{ open, prefilledQuery, openAssistant, closeAssistant }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAssistant() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAssistant must be used within AssistantProvider');
  return ctx;
}
