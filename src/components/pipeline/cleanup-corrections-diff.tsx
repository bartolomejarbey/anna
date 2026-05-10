'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

export type CleanupCorrection = {
  from: string;
  to: string;
  reason: 'name' | 'diacritic' | 'typo' | 'punctuation';
};

const REASON_LABEL: Record<CleanupCorrection['reason'], string> = {
  name: 'Jméno / značka',
  diacritic: 'Diakritika',
  typo: 'Překlep',
  punctuation: 'Interpunkce',
};

interface CleanupCorrectionsDiffProps {
  corrections: CleanupCorrection[] | null | undefined;
  className?: string;
}

export function CleanupCorrectionsDiff({
  corrections,
  className,
}: CleanupCorrectionsDiffProps): React.ReactElement | null {
  const [expanded, setExpanded] = useState(false);

  if (!corrections || corrections.length === 0) return null;

  const summary = `Anna opravila ${corrections.length} ${
    corrections.length === 1 ? 'překlep nebo jméno' : corrections.length < 5 ? 'překlepy nebo jména' : 'překlepů nebo jmen'
  }`;

  return (
    <Card variant="compact" className={cn('flex flex-col gap-3', className)}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center justify-between text-left"
      >
        <span className="text-caption text-tertiary">Cleanup diff</span>
        <span className="text-body-sm text-secondary">
          {summary} · {expanded ? 'skrýt' : 'zobrazit'}
        </span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-1 border-t border-border-subtle pt-3">
          {corrections.map((c, i) => (
            <div
              key={`${c.from}-${c.to}-${i}`}
              className="flex items-center gap-3 py-1.5 text-body-sm"
            >
              <span className="font-mono text-[color:var(--color-error)] line-through truncate">{c.from}</span>
              <span className="text-tertiary">→</span>
              <span className="font-mono text-primary truncate">{c.to}</span>
              <span className="ml-auto text-caption text-tertiary whitespace-nowrap">
                {REASON_LABEL[c.reason]}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
