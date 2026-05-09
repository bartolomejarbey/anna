import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

interface OfferPreviewProps {
  pdfUrl: string;
  customerName?: string;
  className?: string;
}

export function OfferPreview({
  pdfUrl,
  customerName,
  className,
}: OfferPreviewProps): React.ReactElement {
  const heading = customerName ? `Nabídka pro ${customerName}` : 'Nabídka';

  return (
    <Card className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-h3 text-primary">{heading}</h3>
        <a
          href={pdfUrl}
          download
          className="inline-flex h-10 items-center justify-center rounded-[8px] bg-accent px-4 text-body font-medium text-accent-text transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          Stáhnout
        </a>
      </div>

      <div className="aspect-[1/1.414] w-full overflow-hidden rounded-[12px] border border-border-subtle">
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
