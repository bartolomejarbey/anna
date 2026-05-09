import React from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/cn';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OfferPreviewProps {
  pdfUrl: string;
  customerName?: string;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Renders a PDF offer inside a sandboxed iframe with a download button.
 * Uses <a download> instead of next/link — appropriate for external / blob URLs.
 * The iframe sandbox attribute blocks script execution in the embedded PDF viewer.
 */
export function OfferPreview({
  pdfUrl,
  customerName,
  className,
}: OfferPreviewProps): React.ReactElement {
  const heading = customerName ? `Nabídka pro ${customerName}` : 'Nabídka';

  return (
    <Card className={cn('flex flex-col gap-6', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">{heading}</h3>
          {/* Download button — styled to match Button primary, using <a> for native download */}
          <a
            href={pdfUrl}
            download
            className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-6 text-[15px] font-medium text-bg-primary transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Stáhnout PDF
          </a>
        </div>
      </CardHeader>

      {/* A4 aspect ratio: 1 : √2 ≈ 1 : 1.414 */}
      <div className="w-full overflow-hidden rounded-xl border border-border-subtle aspect-[1/1.414]">
        <iframe
          src={pdfUrl}
          title={heading}
          loading="lazy"
          sandbox=""
          className="h-full w-full"
        />
      </div>
    </Card>
  );
}
