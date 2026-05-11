'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import {
  UploadSimple,
  FilePdf,
  IdentificationCard,
  X,
  CheckCircle,
  Spinner,
} from '@phosphor-icons/react';
import {
  listCustomerUploads,
  removeFinplanDocument,
  submitFinplanSession,
  uploadFinplanDocument,
  type CustomerUpload as UploadRow,
} from '@/lib/actions/finplan-customer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type UploadKind = 'bank_statement' | 'id_front' | 'id_back';

interface Props {
  token: string;
  customerName: string;
  initialEmploymentType: 'employee' | 'selfemployed' | null;
}

const ACCEPT: Record<UploadKind, Record<string, string[]>> = {
  bank_statement: {
    'application/pdf': ['.pdf'],
  },
  id_front: {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/heic': ['.heic'],
    'image/webp': ['.webp'],
  },
  id_back: {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/heic': ['.heic'],
    'image/webp': ['.webp'],
  },
};

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

export function CustomerUpload({ token, customerName, initialEmploymentType }: Props) {
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [pendingUploads, setPendingUploads] = useState<Record<UploadKind, number>>({
    bank_statement: 0,
    id_front: 0,
    id_back: 0,
  });
  const [employmentType, setEmploymentType] = useState<'employee' | 'selfemployed'>(
    initialEmploymentType ?? 'employee',
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();

  // Initial load
  useEffect(() => {
    listCustomerUploads(token)
      .then(setUploads)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [token]);

  const bankStatements = uploads.filter((u) => u.kind === 'bank_statement');
  const idFront = uploads.find((u) => u.kind === 'id_front');
  const idBack = uploads.find((u) => u.kind === 'id_back');

  const handleUpload = useCallback(
    async (kind: UploadKind, files: File[]) => {
      if (files.length === 0) return;
      setError(null);
      setPendingUploads((p) => ({ ...p, [kind]: p[kind] + files.length }));

      for (const file of files) {
        try {
          const fd = new FormData();
          fd.set('token', token);
          fd.set('kind', kind);
          fd.set('file', file);
          await uploadFinplanDocument(fd);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }

      try {
        const next = await listCustomerUploads(token);
        setUploads(next);
      } catch {
        // ignore
      }
      setPendingUploads((p) => ({ ...p, [kind]: Math.max(0, p[kind] - files.length) }));
    },
    [token],
  );

  const handleRemove = useCallback(
    async (uploadId: string) => {
      setError(null);
      try {
        await removeFinplanDocument({ token, uploadId });
        setUploads((u) => u.filter((x) => x.id !== uploadId));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [token],
  );

  const canSubmit = bankStatements.length >= 1 && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setError(null);
    startSubmit(async () => {
      try {
        await submitFinplanSession({ token, employmentType });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  return (
    <div className="flex flex-col gap-10">
      {/* 1. Bankovní výpisy */}
      <Section
        index="1"
        title="Bankovní výpisy"
        subtitle={`Posledních 12 měsíců (nebo kolik máš). Jen PDF. Stáhneš v internetbankingu — bývá to pod „Výpisy" nebo „Historie".`}
      >
        <Dropzone
          kind="bank_statement"
          multiple
          onDrop={(files) => handleUpload('bank_statement', files)}
          label="Přetáhni PDF výpisy, nebo klikni a vyber"
        />
        <UploadList
          items={bankStatements}
          pending={pendingUploads.bank_statement}
          onRemove={handleRemove}
        />
      </Section>

      {/* 2. Občanský průkaz */}
      <Section
        index="2"
        title="Občanský průkaz"
        subtitle="Fota přední a zadní strany. Stačí čitelná fotka z telefonu."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <IdSlot
            label="Přední strana"
            kind="id_front"
            uploaded={idFront}
            pending={pendingUploads.id_front > 0}
            onUpload={(files) => handleUpload('id_front', files.slice(0, 1))}
            onRemove={(id) => handleRemove(id)}
          />
          <IdSlot
            label="Zadní strana"
            kind="id_back"
            uploaded={idBack}
            pending={pendingUploads.id_back > 0}
            onUpload={(files) => handleUpload('id_back', files.slice(0, 1))}
            onRemove={(id) => handleRemove(id)}
          />
        </div>
      </Section>

      {/* 3. Zaměstnání */}
      <Section
        index="3"
        title="Jak vyděláváš?"
        subtitle="Ovlivní to výpočet sociálních dávek a doporučení."
      >
        <div className="inline-flex rounded-[10px] border border-border-default bg-surface p-1">
          <SegmentBtn
            active={employmentType === 'employee'}
            onClick={() => setEmploymentType('employee')}
          >
            Zaměstnanec
          </SegmentBtn>
          <SegmentBtn
            active={employmentType === 'selfemployed'}
            onClick={() => setEmploymentType('selfemployed')}
          >
            OSVČ
          </SegmentBtn>
        </div>
      </Section>

      {/* Submit */}
      <div className="mt-2 flex flex-col gap-4 border-t border-border-subtle pt-8">
        {error && (
          <div className="rounded-[8px] border border-[color-mix(in_oklab,_var(--color-error)_30%,_transparent)] bg-error-bg px-4 py-3 text-body-sm text-error">
            {error}
          </div>
        )}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-body-sm text-secondary">
            {customerName ? `${customerName.split(' ')[0]}, ` : ''}
            jakmile budeš mít všechno nahrané, klikni na „Odeslat&ldquo;.
            {bankStatements.length === 0 && ' Potřebuješ aspoň jeden výpis.'}
          </p>
          <Button onClick={handleSubmit} disabled={!canSubmit} size="default">
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size={16} weight="regular" className="animate-spin" />
                Zpracovávám…
              </span>
            ) : (
              'Odeslat dokumenty'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function Section({
  index,
  title,
  subtitle,
  children,
}: {
  index: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 flex items-baseline gap-3">
        <span className="text-caption text-tertiary tabular-nums">{index}</span>
        <h2 className="text-h2 text-primary">{title}</h2>
      </div>
      <p className="mb-5 text-body-sm text-secondary max-w-[60ch]">{subtitle}</p>
      {children}
    </section>
  );
}

function Dropzone({
  kind,
  multiple,
  onDrop,
  label,
}: {
  kind: UploadKind;
  multiple: boolean;
  onDrop: (files: File[]) => void;
  label: string;
}) {
  const [rejection, setRejection] = useState<string | null>(null);

  const onDropCb = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        const reason = rejected[0]?.errors[0]?.code;
        if (reason === 'file-too-large') setRejection('Soubor je větší než 25 MB.');
        else if (reason === 'file-invalid-type') setRejection('Tento typ souboru nepodporujeme.');
        else setRejection('Soubor se nepodařilo přidat.');
      } else {
        setRejection(null);
      }
      if (accepted.length > 0) onDrop(accepted);
    },
    [onDrop],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropCb,
    accept: ACCEPT[kind],
    maxSize: MAX_SIZE,
    multiple,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed bg-surface px-6 py-12 text-center transition-colors',
          isDragActive
            ? 'border-accent bg-accent-muted'
            : 'border-border-default hover:border-accent hover:bg-subtle',
        )}
      >
        <input {...getInputProps()} />
        <UploadSimple size={28} weight="regular" className="text-secondary" />
        <p className="text-body text-primary">{label}</p>
        <p className="text-body-sm text-tertiary">PDF až 25 MB</p>
      </div>
      {rejection && (
        <p className="mt-3 text-body-sm text-error">{rejection}</p>
      )}
    </div>
  );
}

function UploadList({
  items,
  pending,
  onRemove,
}: {
  items: UploadRow[];
  pending: number;
  onRemove: (id: string) => void;
}) {
  if (items.length === 0 && pending === 0) return null;

  return (
    <ul className="mt-4 flex flex-col gap-2">
      {items.map((u) => (
        <li
          key={u.id}
          className="flex items-center justify-between gap-3 rounded-[8px] border border-border-subtle bg-surface px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <FilePdf size={18} weight="regular" className="flex-shrink-0 text-secondary" />
            <span className="truncate text-body-sm text-primary">{u.fileName}</span>
            <span className="text-body-sm text-tertiary">
              {(u.fileSize / 1024 / 1024).toFixed(1)} MB
            </span>
          </div>
          <button
            type="button"
            onClick={() => onRemove(u.id)}
            className="rounded-[6px] p-1.5 text-tertiary transition-colors hover:bg-subtle hover:text-primary"
            aria-label="Smazat"
          >
            <X size={16} weight="regular" />
          </button>
        </li>
      ))}
      {Array.from({ length: pending }).map((_, i) => (
        <li
          key={`pending-${i}`}
          className="flex items-center gap-3 rounded-[8px] border border-border-subtle bg-subtle px-4 py-3"
        >
          <Spinner size={16} weight="regular" className="animate-spin text-secondary" />
          <span className="text-body-sm text-secondary">Nahrávám…</span>
        </li>
      ))}
    </ul>
  );
}

function IdSlot({
  label,
  kind,
  uploaded,
  pending,
  onUpload,
  onRemove,
}: {
  label: string;
  kind: UploadKind;
  uploaded: UploadRow | undefined;
  pending: boolean;
  onUpload: (files: File[]) => void;
  onRemove: (id: string) => void;
}) {
  const [rejection, setRejection] = useState<string | null>(null);

  const onDropCb = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        const reason = rejected[0]?.errors[0]?.code;
        if (reason === 'file-too-large') setRejection('Soubor je větší než 25 MB.');
        else if (reason === 'file-invalid-type') setRejection('Vyfoť to ještě jednou — JPG nebo PNG.');
        else setRejection('Soubor se nepodařilo přidat.');
      } else {
        setRejection(null);
      }
      if (accepted.length > 0) onUpload(accepted);
    },
    [onUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropCb,
    accept: ACCEPT[kind],
    maxSize: MAX_SIZE,
    multiple: false,
    disabled: !!uploaded || pending,
  });

  if (uploaded) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[12px] border border-border-subtle bg-surface px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <CheckCircle size={20} weight="regular" className="flex-shrink-0 text-success" />
          <div className="min-w-0">
            <p className="text-body-sm font-medium text-primary">{label}</p>
            <p className="truncate text-body-sm text-tertiary">{uploaded.fileName}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(uploaded.id)}
          className="rounded-[6px] p-1.5 text-tertiary transition-colors hover:bg-subtle hover:text-primary"
          aria-label="Smazat"
        >
          <X size={16} weight="regular" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed bg-surface px-6 py-8 text-center transition-colors',
          isDragActive
            ? 'border-accent bg-accent-muted'
            : 'border-border-default hover:border-accent hover:bg-subtle',
          pending && 'cursor-wait opacity-60',
        )}
      >
        <input {...getInputProps()} />
        {pending ? (
          <Spinner size={20} weight="regular" className="animate-spin text-secondary" />
        ) : (
          <IdentificationCard size={20} weight="regular" className="text-secondary" />
        )}
        <p className="text-body-sm font-medium text-primary">{label}</p>
        <p className="text-body-sm text-tertiary">Fotka — JPG, PNG, HEIC</p>
      </div>
      {rejection && <p className="mt-3 text-body-sm text-error">{rejection}</p>}
    </div>
  );
}

function SegmentBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-[8px] px-4 py-2 text-body-sm font-medium transition-colors',
        active ? 'bg-accent text-accent-text' : 'text-secondary hover:bg-subtle',
      )}
    >
      {children}
    </button>
  );
}
