'use client';

import { useState } from 'react';
import { Copy, Check } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface Props {
  url: string;
}

export function ShareLinkPanel({ url }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <label className="mb-2 block text-caption text-tertiary">Odkaz pro zákazníka</label>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          onClick={(e) => e.currentTarget.select()}
          className="flex h-10 flex-1 rounded-[8px] border border-border-default bg-surface px-3 text-body-sm font-mono text-primary focus:outline-none focus:border-accent"
        />
        <Button onClick={handleCopy} variant="secondary" size="default">
          {copied ? (
            <span className="inline-flex items-center gap-2">
              <Check size={16} weight="regular" />
              Zkopírováno
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Copy size={16} weight="regular" />
              Zkopírovat
            </span>
          )}
        </Button>
      </div>
      <p className="mt-3 text-body-sm text-tertiary">
        Pošli odkaz e-mailem nebo SMS. Tato stránka se aktualizuje, jakmile zákazník nahraje
        dokumenty.
      </p>
    </div>
  );
}
