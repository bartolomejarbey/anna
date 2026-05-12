import { ShieldCheck, LockKey, FileText, IdentificationCard } from '@phosphor-icons/react/dist/ssr';
import {
  getCustomerSession,
  markSessionOpened,
  type CustomerSessionInfo,
} from '@/lib/actions/finplan-customer';
import { CustomerUpload } from '@/components/finplan/customer-upload';
import { PlanThanks } from '@/components/finplan/plan-thanks';
import { PlanError } from '@/components/finplan/plan-error';

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

  // Fire-and-forget: označ jako otevřený. Pokud spadne, nezablokujeme stránku.
  void markSessionOpened(token).catch(() => {});

  if (
    session.status === 'uploaded' ||
    session.status === 'extracting' ||
    session.status === 'analyzed'
  ) {
    return <PlanThanks customerName={session.customerName} advisorName={session.advisorName} />;
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 pt-20 pb-24 md:px-8">
      <header className="mb-16">
        <p className="anna-section-rule mb-5" aria-hidden />
        <p className="mb-4 text-caption text-tertiary">Finanční plán</p>
        <h1 className="mb-6 text-h1 text-primary">
          {session.customerName ? `${session.customerName.split(' ')[0]}, ` : ''}
          tvůj poradce {session.advisorName} tě požádal o pár dokumentů.
        </h1>
        <p className="text-prose text-secondary">
          Nahrávat budeš výpisy z účtu za posledních 12 měsíců a fotku občanského průkazu.
          Z dokumentů spočítáme tvůj finanční plán &mdash; cashflow, pojistné krytí, doporučení na
          penzi. Trvá to obvykle 30 sekund.
        </p>
      </header>

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

      <footer className="mt-16 border-t border-border-subtle pt-8">
        <div className="flex items-start gap-3 text-body-sm text-tertiary">
          <IdentificationCard size={18} weight="regular" className="mt-0.5 flex-shrink-0" />
          <p className="max-w-[60ch]">
            Fotku občanky používáme pouze k identifikaci pro analýzu. Po vytvoření plánu ji
            poradce nevidí — slouží jen interně k ověření jména a věku.
          </p>
        </div>
      </footer>
    </div>
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
    <div className="rounded-[12px] border border-border-subtle bg-surface p-5">
      <Icon size={20} weight="regular" className="mb-3 text-accent" />
      <p className="mb-1 text-body font-medium text-primary">{title}</p>
      <p className="text-body-sm text-secondary">{body}</p>
    </div>
  );
}
