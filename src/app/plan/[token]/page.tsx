import { ShieldCheck, LockKey, FileText, IdentificationCard } from '@phosphor-icons/react/dist/ssr';
import {
  getCustomerSession,
  markSessionOpened,
  type CustomerSessionInfo,
} from '@/lib/actions/finplan-customer';
import { CustomerUpload } from '@/components/finplan/customer-upload';
import { PlanThanks } from '@/components/finplan/plan-thanks';
import { PlanError } from '@/components/finplan/plan-error';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { AnnaWordmark } from '@/components/brand/anna-wordmark';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PlanPage({ params }: PageProps) {
  const { token } = await params;

  let session: CustomerSessionInfo;
  try {
    session = await getCustomerSession(token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Něco se pokazilo.';
    return <PlanError message={msg} />;
  }

  void markSessionOpened(token).catch(() => {});

  if (
    session.status === 'uploaded' ||
    session.status === 'extracting' ||
    session.status === 'analyzed'
  ) {
    return <PlanThanks customerName={session.customerName} advisorName={session.advisorName} />;
  }

  const firstName = session.customerName ? session.customerName.split(' ')[0] : null;

  return (
    <PageShell width="narrow">
      <div className="pt-12 pb-2">
        <AnnaWordmark size="sm" />
      </div>

      <PageHeader
        eyebrow="Finanční plán"
        title={
          firstName
            ? `${firstName}, ${session.advisorName} tě požádal o pár dokumentů.`
            : `${session.advisorName} tě požádal o pár dokumentů.`
        }
        description="Nahraj výpisy z účtu za posledních 12 měsíců a fotku občanského průkazu. Z dokumentů Anna spočítá cashflow, pojistné krytí a doporučení na penzi. Trvá to obvykle 30 sekund."
        variant="default"
      />

      <section className="mb-12 grid gap-3 md:grid-cols-3">
        <PrivacyTile
          icon={LockKey}
          title="Šifrované"
          body="Soubory jsou šifrované při přenosu i v úložišti. Mažeme je po 30 dnech."
        />
        <PrivacyTile
          icon={ShieldCheck}
          title="Poradce nevidí transakce"
          body="Z výpisů vytáhneme jen měsíční souhrn. Poradce uvidí příjem a výdaje, ne nákupy."
        />
        <PrivacyTile
          icon={FileText}
          title="Žádná instalace"
          body="Vše proběhne v prohlížeči. Nemusíš nic stahovat ani instalovat."
        />
      </section>

      <CustomerUpload
        token={token}
        customerName={session.customerName}
        initialEmploymentType={session.employmentType}
        initialPrivacyMode={session.privacyMode}
      />

      <footer className="mt-16 border-t border-border-subtle pt-8 pb-16">
        <div className="flex items-start gap-3 text-body-sm text-tertiary">
          <IdentificationCard size={18} weight="regular" className="mt-0.5 flex-shrink-0" />
          <p className="max-w-[60ch]">
            Fotku občanky používáme pouze k identifikaci pro analýzu. Po vytvoření plánu ji
            poradce nevidí — slouží jen interně k ověření jména a věku.
          </p>
        </div>
      </footer>
    </PageShell>
  );
}

function PrivacyTile({
  icon: Icon,
  title,
  body,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[14px] border border-border-subtle bg-surface p-5">
      <Icon size={20} weight="regular" className="mb-3 text-accent" />
      <p className="mb-1 text-body font-medium text-primary">{title}</p>
      <p className="text-body-sm text-secondary">{body}</p>
    </div>
  );
}
