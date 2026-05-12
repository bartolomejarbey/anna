import Link from 'next/link';
import { CurrencyCircleDollar } from '@phosphor-icons/react/dist/ssr';
import { listFinplanSessions } from '@/lib/actions/finplan';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ListRow } from '@/components/ui/list-row';

export const metadata = { title: 'Finanční plány — Anna' };

type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'accent' | 'processing';

const STATUS_CONFIG: Record<string, { label: string; tone: Tone; dot?: boolean }> = {
  created: { label: 'Odkaz odeslán', tone: 'neutral' },
  opened: { label: 'Zákazník otevřel', tone: 'accent' },
  uploading: { label: 'Nahrává dokumenty', tone: 'processing', dot: true },
  uploaded: { label: 'Dokumenty nahrány', tone: 'accent' },
  extracting: { label: 'Zpracovávám', tone: 'processing', dot: true },
  analyzed: { label: 'Hotovo', tone: 'success', dot: true },
  failed: { label: 'Selhalo', tone: 'error', dot: true },
};

const DATE = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default async function FinplanPage() {
  const sessions = await listFinplanSessions().catch(() => []);

  return (
    <PageShell>
      <PageHeader
        title="Finanční plány"
        description="Pošli zákazníkovi odkaz, on nahraje výpisy. Anna spočítá cashflow, krytí a důchod."
        actions={
          <Link href="/lukas-finplan/novy">
            <Button>Nový plán</Button>
          </Link>
        }
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon={CurrencyCircleDollar}
          heading="Zatím žádný plán."
          description="Pošli zákazníkovi odkaz a Anna z výpisů spočítá cashflow, krytí a doporučení."
          action={{ label: 'Nový plán', href: '/lukas-finplan/novy' }}
        />
      ) : (
        <ul className="divide-y divide-border-subtle">
          {sessions.map((s) => {
            const isAnalyzed = s.status === 'analyzed';
            const href = isAnalyzed
              ? `/lukas-finplan/${s.id}`
              : `/lukas-finplan/sdilet/${s.id}`;
            const cfg = STATUS_CONFIG[s.status] ?? { label: s.status, tone: 'neutral' as Tone };
            return (
              <li key={s.id}>
                <ListRow
                  href={href}
                  primary={<span className="font-medium">{s.customerName}</span>}
                  secondary={`Vytvořeno ${DATE.format(new Date(s.createdAt))}`}
                  trailing={
                    <StatusPill tone={cfg.tone} dot={cfg.dot}>
                      {cfg.label}
                    </StatusPill>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
