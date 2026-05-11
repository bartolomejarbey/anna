import Link from 'next/link';
import { CurrencyCircleDollar, ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { listFinplanSessions } from '@/lib/actions/finplan';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = { title: 'Finanční plány — Anna' };

const STATUS_LABEL: Record<string, string> = {
  created: 'Odkaz odeslán',
  opened: 'Zákazník otevřel',
  uploading: 'Nahrává dokumenty',
  uploaded: 'Dokumenty nahrány',
  extracting: 'Zpracovávám…',
  analyzed: 'Hotovo',
  failed: 'Selhalo',
};

const DATE = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default async function FinplanPage() {
  const sessions = await listFinplanSessions().catch(() => []);

  return (
    <div className="mx-auto w-full max-w-[960px] px-8 py-16">
      <div className="mb-12 flex items-end justify-between">
        <h1 className="text-h1 text-primary">Finanční plány</h1>
        <Link
          href="/financni-plan/novy"
          className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-accent px-4 text-body font-medium text-accent-text transition-opacity hover:opacity-90"
        >
          Nový plán
          <ArrowRight size={16} weight="regular" />
        </Link>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={CurrencyCircleDollar}
          heading="Zatím žádný plán."
          description="Pošli zákazníkovi odkaz a Anna z výpisů spočítá cashflow, krytí a doporučení."
          action={{ label: 'Nový plán', href: '/financni-plan/novy' }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((s) => {
            const isAnalyzed = s.status === 'analyzed';
            const href = isAnalyzed
              ? `/financni-plan/${s.id}`
              : `/financni-plan/sdilet/${s.id}`;
            return (
              <li key={s.id}>
                <Link href={href}>
                  <Card
                    variant="compact"
                    className="flex items-center justify-between transition-colors hover:border-border-default"
                  >
                    <div className="flex flex-col gap-1">
                      <p className="text-body font-medium text-primary">{s.customerName}</p>
                      <p className="text-body-sm text-tertiary">
                        Vytvořeno {DATE.format(new Date(s.createdAt))}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-body-sm text-secondary">
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                      <ArrowRight size={16} weight="regular" className="text-tertiary" />
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
