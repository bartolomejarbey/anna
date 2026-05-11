'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Copy, Check, ArrowRight } from '@phosphor-icons/react';
import { createFinplanSession, type CreatedSession } from '@/lib/actions/finplan';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  customers: Array<{ id: string; full_name: string; email: string | null }>;
}

export function NewFinplanForm({ customers }: Props) {
  const [customerId, setCustomerId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreatedSession | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  if (customers.length === 0) {
    return (
      <div className="rounded-[12px] border border-border-subtle bg-surface p-6">
        <p className="text-body text-primary">Nemáš zatím žádné zákazníky.</p>
        <p className="mt-2 text-body-sm text-secondary">
          Nejdřív přidej zákazníka v sekci Zákazníci, pak se sem vrať.
        </p>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!customerId) {
      setError('Vyber zákazníka.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const created = await createFinplanSession({ customerId });
        setResult(created);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (result) {
    const customer = customers.find((c) => c.id === customerId);
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-[12px] border border-success/30 bg-success-bg p-6">
          <p className="mb-2 text-body font-medium text-primary">
            Odkaz pro {customer?.full_name} je vytvořený.
          </p>
          <p className="text-body-sm text-secondary">
            Pošli ho zákazníkovi e-mailem nebo SMS. Platí 30 dní.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-caption text-tertiary">Odkaz pro zákazníka</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={result.url}
              className="flex h-10 flex-1 rounded-[8px] border border-border-default bg-surface px-3 text-body-sm font-mono text-primary focus:outline-none focus:border-accent"
              onClick={(e) => e.currentTarget.select()}
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
        </div>

        <div className="flex gap-3 border-t border-border-subtle pt-6">
          <Button
            variant="secondary"
            onClick={() => {
              setResult(null);
              setCustomerId('');
            }}
          >
            Vytvořit další
          </Button>
          <Link
            href="/financni-plan"
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-accent px-4 text-body font-medium text-accent-text transition-opacity hover:opacity-90"
          >
            Hotovo
            <ArrowRight size={16} weight="regular" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="mb-2 block text-caption text-tertiary">Zákazník</label>
        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger>
            <SelectValue placeholder="Vyber zákazníka…" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.full_name}
                {c.email && (
                  <span className="ml-2 text-body-sm text-tertiary">{c.email}</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-[8px] border border-[color-mix(in_oklab,_var(--color-error)_30%,_transparent)] bg-error-bg px-4 py-3 text-body-sm text-error">
          {error}
        </div>
      )}

      <div className="flex gap-3 border-t border-border-subtle pt-6">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Vytvářím…' : 'Vytvořit odkaz'}
        </Button>
        <Link
          href="/financni-plan"
          className="inline-flex h-10 items-center rounded-[8px] border border-border-default bg-transparent px-4 text-body font-medium text-primary transition-colors hover:bg-subtle"
        >
          Zrušit
        </Link>
      </div>
    </div>
  );
}
