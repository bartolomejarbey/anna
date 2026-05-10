'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

interface TranscriptViewerProps {
  text: string;
  /** Cleaned (po AI cleanup). Pokud chybí, toggle se nezobrazuje. */
  cleanedText?: string | null;
  language?: string;
  loadingPartial?: string;
  className?: string;
}

type Variant = 'cleaned' | 'raw';

export function TranscriptViewer({
  text,
  cleanedText,
  language = 'cs',
  loadingPartial,
  className,
}: TranscriptViewerProps): React.ReactElement {
  const hasCleaned = !!(cleanedText && cleanedText.trim().length > 0);
  const [variant, setVariant] = useState<Variant>(hasCleaned ? 'cleaned' : 'raw');

  const display = variant === 'cleaned' && hasCleaned ? cleanedText! : text;

  return (
    <Card className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-h3 text-primary">Přepis</h3>
        <div className="flex items-center gap-3">
          {hasCleaned && (
            <div className="inline-flex rounded-[8px] border border-border-subtle p-0.5">
              <button
                type="button"
                onClick={() => setVariant('cleaned')}
                className={cn(
                  'h-7 rounded-[6px] px-3 text-body-sm font-medium transition-colors',
                  variant === 'cleaned'
                    ? 'bg-inset text-primary'
                    : 'text-tertiary hover:text-secondary',
                )}
              >
                Po cleanupu
              </button>
              <button
                type="button"
                onClick={() => setVariant('raw')}
                className={cn(
                  'h-7 rounded-[6px] px-3 text-body-sm font-medium transition-colors',
                  variant === 'raw'
                    ? 'bg-inset text-primary'
                    : 'text-tertiary hover:text-secondary',
                )}
              >
                Surový
              </button>
            </div>
          )}
          <span className="text-caption text-tertiary">{language.toUpperCase()}</span>
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {display ? (
          <p className="text-body whitespace-pre-wrap text-primary">{display}</p>
        ) : (
          <p className="text-body text-tertiary">Přepis není k dispozici.</p>
        )}
      </div>

      {loadingPartial !== undefined && (
        <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
          {loadingPartial && (
            <p className="text-body whitespace-pre-wrap text-secondary">{loadingPartial}</p>
          )}
          <div className="flex flex-col gap-2">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-4/5" />
            <div className="skeleton h-3 w-3/5" />
          </div>
        </div>
      )}
    </Card>
  );
}
