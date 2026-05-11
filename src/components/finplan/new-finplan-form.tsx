'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Copy, Check, ArrowRight, Plus } from '@phosphor-icons/react';
import { createFinplanSession, type CreatedSession } from '@/lib/actions/finplan';
import { createCustomer } from '@/lib/actions/customers';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CustomerOption {
  id: string;
  full_name: string;
  email: string | null;
}

interface Props {
  customers: CustomerOption[];
}

export function NewFinplanForm({ customers: initialCustomers }: Props) {
  const [customers, setCustomers] = useState<CustomerOption[]>(initialCustomers);
  const [customerId, setCustomerId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreatedSession | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(initialCustomers.length === 0);

  const handleSubmit = () => {
    if (!customerId) {
      setError('Vyber zákazníka.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createFinplanSession({ customerId });
      if (res.ok) {
        setResult(res.session);
      } else {
        setError(res.error);
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

  const handleCustomerCreated = (c: CustomerOption) => {
    setCustomers((prev) =>
      [...prev, c].sort((a, b) => a.full_name.localeCompare(b.full_name, 'cs')),
    );
    setCustomerId(c.id);
    setShowNewCustomer(false);
    setError(null);
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
      {customers.length > 0 && !showNewCustomer && (
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
          <button
            type="button"
            onClick={() => setShowNewCustomer(true)}
            className="mt-2 inline-flex items-center gap-1.5 text-body-sm text-secondary transition-colors hover:text-accent"
          >
            <Plus size={14} weight="regular" />
            Nebo přidat nového zákazníka
          </button>
        </div>
      )}

      {showNewCustomer && (
        <NewCustomerInline
          onCreated={handleCustomerCreated}
          onCancel={
            customers.length > 0 ? () => setShowNewCustomer(false) : undefined
          }
        />
      )}

      {error && (
        <div className="rounded-[8px] border border-[color-mix(in_oklab,_var(--color-error)_30%,_transparent)] bg-error-bg px-4 py-3 text-body-sm text-error">
          {error}
        </div>
      )}

      {!showNewCustomer && (
        <div className="flex gap-3 border-t border-border-subtle pt-6">
          <Button onClick={handleSubmit} disabled={isPending || !customerId}>
            {isPending ? 'Vytvářím…' : 'Vytvořit odkaz'}
          </Button>
          <Link
            href="/financni-plan"
            className="inline-flex h-10 items-center rounded-[8px] border border-border-default bg-transparent px-4 text-body font-medium text-primary transition-colors hover:bg-subtle"
          >
            Zrušit
          </Link>
        </div>
      )}
    </div>
  );
}

function NewCustomerInline({
  onCreated,
  onCancel,
}: {
  onCreated: (c: CustomerOption) => void;
  onCancel?: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    const trimmed = fullName.trim();
    if (!trimmed) {
      setError('Zadej jméno zákazníka.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createCustomer({
        full_name: trimmed,
        email: email.trim() || null,
        phone: phone.trim() || null,
      });
      if (res.ok) {
        onCreated(res.customer);
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="rounded-[12px] border border-border-subtle bg-surface p-6">
      <p className="mb-1 text-body font-medium text-primary">Nový zákazník</p>
      <p className="mb-5 text-body-sm text-secondary">
        Stačí jméno. E-mail a telefon jsou volitelné — klientská zóna pro zákazníka není nutná.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-caption text-tertiary">Jméno *</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoFocus
            placeholder="Např. Jan Novák"
            className="flex h-10 w-full rounded-[8px] border border-border-default bg-surface px-3 text-body text-primary placeholder:text-tertiary focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-caption text-tertiary">E-mail (volitelné)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jan@example.cz"
              className="flex h-10 w-full rounded-[8px] border border-border-default bg-surface px-3 text-body text-primary placeholder:text-tertiary focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-caption text-tertiary">Telefon (volitelné)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+420 …"
              className="flex h-10 w-full rounded-[8px] border border-border-default bg-surface px-3 text-body text-primary placeholder:text-tertiary focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-[8px] border border-[color-mix(in_oklab,_var(--color-error)_30%,_transparent)] bg-error-bg px-4 py-3 text-body-sm text-error">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button onClick={handleCreate} disabled={isPending}>
            {isPending ? 'Ukládám…' : 'Uložit a pokračovat'}
          </Button>
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              Zrušit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
