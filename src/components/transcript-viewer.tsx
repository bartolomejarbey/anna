import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

interface TranscriptViewerProps {
  text: string;
  language?: string;
  loadingPartial?: string;
  className?: string;
}

export function TranscriptViewer({
  text,
  language = 'cs',
  loadingPartial,
  className,
}: TranscriptViewerProps): React.ReactElement {
  return (
    <Card className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-h3 text-primary">Přepis</h3>
        <span className="text-caption text-tertiary">{language.toUpperCase()}</span>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {text ? (
          <p className="text-body whitespace-pre-wrap text-primary">{text}</p>
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
