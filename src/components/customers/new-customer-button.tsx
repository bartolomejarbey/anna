'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from '@phosphor-icons/react';
import { createCustomer } from '@/lib/actions/customers';
import { Button } from '@/components/ui/button';

export function NewCustomerButton({ variant = 'primary' }: { variant?: 'primary' | 'inline' }) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const reset = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setError(null);
  };

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const handleSubmit = () => {
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
        handleClose();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        variant={variant === 'inline' ? 'secondary' : 'primary'}
      >
        <span className="inline-flex items-center gap-2">
          <Plus size={16} weight="regular" />
          Nový zákazník
        </span>
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/15 p-4">
      <div
        className="w-full max-w-[560px] rounded-[16px] border border-border-default bg-surface p-8 shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="mb-1 text-h2 text-primary">Nový zákazník</p>
            <p className="text-body-sm text-secondary">
              Stačí jméno. Klientská zóna pro něj není potřeba.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Zavřít"
            className="rounded-[6px] p-1 text-tertiary transition-colors hover:bg-subtle hover:text-primary"
          >
            <X size={18} weight="regular" />
          </button>
        </div>

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

          <div className="mt-2 flex gap-3 border-t border-border-subtle pt-6">
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Ukládám…' : 'Uložit'}
            </Button>
            <Button variant="secondary" onClick={handleClose}>
              Zrušit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
