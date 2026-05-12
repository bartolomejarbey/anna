'use client';

import { useState } from 'react';
import { CaretDown, CaretRight, Warning, CheckCircle } from '@phosphor-icons/react';
import type { FinplanDebugBundle, FinplanDebugUpload } from '@/lib/actions/finplan';

interface Props {
  bundle: FinplanDebugBundle;
}

const KIND_LABEL: Record<FinplanDebugUpload['kind'], string> = {
  bank_statement: 'Bankovní výpis',
  id_front: 'OP — přední',
  id_back: 'OP — zadní',
  other: 'Jiné',
};

const CZK = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  maximumFractionDigits: 0,
});

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} kB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export function FinplanDebugPanel({ bundle }: Props) {
  const [open, setOpen] = useState(false);

  const counts = bundle.uploads.reduce(
    (acc, u) => {
      if (u.extractError) acc.errored++;
      else if (u.extractedAt) acc.ok++;
      else acc.pending++;
      return acc;
    },
    { ok: 0, errored: 0, pending: 0 },
  );

  return (
    <section className="mt-12 rounded-[12px] border border-border-subtle bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <div className="flex flex-col gap-1">
          <p className="text-caption uppercase tracking-wide text-tertiary">
            Debug
          </p>
          <p className="text-h3 text-primary">Co viděla AI</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-body-sm text-secondary">
            {bundle.uploads.length} {bundle.uploads.length === 1 ? 'soubor' : 'souborů'}
            {' · '}
            <span className="text-success">{counts.ok} ok</span>
            {counts.errored > 0 && (
              <>
                {' · '}
                <span className="text-error">{counts.errored} chyba</span>
              </>
            )}
            {counts.pending > 0 && (
              <>
                {' · '}
                <span className="text-tertiary">{counts.pending} čeká</span>
              </>
            )}
          </p>
          {open ? (
            <CaretDown size={16} weight="regular" className="text-tertiary" />
          ) : (
            <CaretRight size={16} weight="regular" className="text-tertiary" />
          )}
        </div>
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-border-subtle p-6">
          {bundle.uploads.length === 0 && (
            <p className="text-body-sm text-secondary">
              Zákazník zatím nenahrál žádný soubor.
            </p>
          )}
          {bundle.uploads.map((u) => (
            <UploadCard key={u.uploadId} upload={u} />
          ))}
        </div>
      )}
    </section>
  );
}

function UploadCard({ upload }: { upload: FinplanDebugUpload }) {
  const [showInput, setShowInput] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [showSystem, setShowSystem] = useState(false);

  const hasError = !!upload.extractError;
  const hasData = !!upload.extractedAt && !hasError;

  return (
    <div className="rounded-[10px] border border-border-subtle bg-bg-subtle/40">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            {hasError ? (
              <Warning size={16} weight="regular" className="text-error" />
            ) : hasData ? (
              <CheckCircle size={16} weight="regular" className="text-success" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-tertiary" />
            )}
            <p className="text-body font-medium text-primary">{upload.fileName}</p>
          </div>
          <p className="text-body-sm text-tertiary">
            {KIND_LABEL[upload.kind]}
            {' · '}
            {formatBytes(upload.fileSize)}
            {upload.mimeType && ` · ${upload.mimeType}`}
          </p>
        </div>
        {(upload.model || upload.tokensUsed || upload.latencyMs) && (
          <div className="text-right text-body-sm text-secondary">
            {upload.model && <p className="font-mono">{upload.model}</p>}
            <p className="text-tertiary">
              {upload.tokensUsed != null && `${upload.tokensUsed} tok`}
              {upload.tokensUsed != null && upload.latencyMs != null && ' · '}
              {upload.latencyMs != null && `${upload.latencyMs} ms`}
            </p>
          </div>
        )}
      </div>

      {hasError && (
        <div className="mx-5 mb-5 rounded-[8px] border border-[color-mix(in_oklab,_var(--color-error)_30%,_transparent)] bg-error-bg px-4 py-3 text-body-sm text-error">
          <p className="mb-1 font-medium">Chyba extrakce</p>
          <p className="font-mono text-body-sm">{upload.extractError}</p>
        </div>
      )}

      {(hasData || upload.rawResponse) && (
        <div className="mx-5 mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {upload.kind === 'bank_statement' && (
            <>
              <Stat label="Příjmy" value={fmtMoney(upload.totalIncome)} />
              <Stat label="Výdaje" value={fmtMoney(upload.totalExpenses)} />
              <Stat
                label="Období"
                value={
                  upload.periodMonths != null
                    ? `${upload.periodMonths} ${upload.periodMonths === 1 ? 'měsíc' : 'měsíců'}`
                    : '—'
                }
              />
              <Stat
                label="Transakce"
                value={upload.transactionCount != null ? String(upload.transactionCount) : '—'}
              />
              <Stat label="Banka" value={upload.bankName ?? '—'} />
            </>
          )}
          {(upload.kind === 'id_front' || upload.kind === 'id_back') && (
            <>
              <Stat label="Jméno" value={upload.idFullName ?? '—'} />
              <Stat label="Narození" value={upload.idBirthDate ?? '—'} />
              <Stat label="Adresa" value={upload.idAddress ?? '—'} />
            </>
          )}
        </div>
      )}

      <div className="border-t border-border-subtle">
        <DebugToggle
          label="Vstup do AI (text výpisu)"
          open={showInput}
          onToggle={() => setShowInput((v) => !v)}
          empty={!upload.inputExcerpt}
        />
        {showInput && upload.inputExcerpt && (
          <pre className="mx-5 mb-4 max-h-[420px] overflow-auto rounded-[8px] bg-bg-inset px-4 py-3 font-mono text-body-sm leading-relaxed text-secondary whitespace-pre-wrap">
            {upload.inputExcerpt}
          </pre>
        )}

        <DebugToggle
          label="Výstup z AI (JSON)"
          open={showOutput}
          onToggle={() => setShowOutput((v) => !v)}
          empty={!upload.rawResponse}
        />
        {showOutput && upload.rawResponse && (
          <pre className="mx-5 mb-4 max-h-[420px] overflow-auto rounded-[8px] bg-bg-inset px-4 py-3 font-mono text-body-sm leading-relaxed text-secondary whitespace-pre-wrap">
            {JSON.stringify(upload.rawResponse, null, 2)}
          </pre>
        )}

        <DebugToggle
          label="System prompt (instrukce)"
          open={showSystem}
          onToggle={() => setShowSystem((v) => !v)}
          empty={!upload.systemPrompt}
        />
        {showSystem && upload.systemPrompt && (
          <pre className="mx-5 mb-4 max-h-[420px] overflow-auto rounded-[8px] bg-bg-inset px-4 py-3 font-mono text-body-sm leading-relaxed text-secondary whitespace-pre-wrap">
            {upload.systemPrompt}
          </pre>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-caption uppercase tracking-wide text-tertiary">{label}</p>
      <p className="text-body text-primary">{value}</p>
    </div>
  );
}

function DebugToggle({
  label,
  open,
  onToggle,
  empty,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  empty: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={empty}
      className="flex w-full items-center justify-between gap-2 border-t border-border-subtle px-5 py-3 text-left text-body-sm text-secondary first:border-t-0 hover:text-primary disabled:opacity-40 disabled:hover:text-secondary"
    >
      <span className="inline-flex items-center gap-2">
        {open ? (
          <CaretDown size={14} weight="regular" />
        ) : (
          <CaretRight size={14} weight="regular" />
        )}
        {label}
      </span>
      {empty && <span className="text-tertiary">—</span>}
    </button>
  );
}

function fmtMoney(value: number | null): string {
  if (value == null) return '—';
  return CZK.format(value);
}
