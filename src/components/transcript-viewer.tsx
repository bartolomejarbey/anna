import React from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import { cn } from '@/lib/cn';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TranscriptViewerProps {
  /** The final reconciled transcript text. */
  text: string;
  /** BCP-47 language tag displayed in the header. Default: 'cs'. */
  language?: string;
  /**
   * When provided, this partial text is rendered below the main content
   * with a LoadingState spinner — indicating the pipeline is still running.
   */
  loadingPartial?: string;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Renders the final reconciled transcript for the advisor.
 * Live_text and whisper_text stay in the DB for fine-tuning; this component
 * shows only the single reconciled string.
 */
export function TranscriptViewer({
  text,
  language = 'cs',
  loadingPartial,
  className,
}: TranscriptViewerProps): React.ReactElement {
  return (
    <Card className={cn('flex flex-col gap-4', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">Přepis schůzky</h3>
          <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            {language.toUpperCase()}
          </span>
        </div>
      </CardHeader>

      {/* Main transcript */}
      <div className="max-h-[500px] overflow-y-auto">
        {text ? (
          <p className="text-[15px] leading-relaxed text-text-primary whitespace-pre-wrap">
            {text}
          </p>
        ) : (
          <p className="text-[15px] text-text-tertiary italic">Přepis není k dispozici.</p>
        )}
      </div>

      {/* Loading partial — shown while pipeline is still running */}
      {loadingPartial !== undefined && (
        <div className="border-t border-border-subtle pt-4 flex flex-col gap-4">
          {loadingPartial && (
            <p className="text-[15px] text-text-secondary leading-relaxed whitespace-pre-wrap">
              {loadingPartial}
            </p>
          )}
          <LoadingState text="Zpracováváme přepis…" className="py-6" />
        </div>
      )}
    </Card>
  );
}
