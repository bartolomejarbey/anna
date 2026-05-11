'use client';

import { useState, useTransition } from 'react';
import { updateFinplanNotes } from '@/lib/actions/finplan';
import { Button } from '@/components/ui/button';

interface Props {
  sessionId: string;
  initialNotes: string;
}

export function NotesPanel({ sessionId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateFinplanNotes({ sessionId, notes });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  return (
    <section>
      <p className="anna-section-rule mb-5" aria-hidden />
      <h2 className="mb-2 text-h2 text-primary">Poznámky</h2>
      <p className="mb-6 text-prose text-secondary">
        Tvoje interní poznámky k plánu. Zákazník je neuvidí.
      </p>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Co probrat na schůzce, co doporučit, jaká pojišťovna…"
        rows={6}
        className="w-full resize-y rounded-[12px] border border-border-default bg-surface px-4 py-3 text-body text-primary placeholder:text-tertiary focus:outline-none focus:border-accent"
      />

      {error && (
        <p className="mt-3 text-body-sm text-error">{error}</p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending} variant="secondary">
          {isPending ? 'Ukládám…' : 'Uložit'}
        </Button>
        {saved && (
          <span className="text-body-sm text-success">Uloženo.</span>
        )}
      </div>
    </section>
  );
}
