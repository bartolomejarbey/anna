import { currentAdvisor } from '@/lib/auth';
import { ToolCard } from '@/components/launchpad/tool-card';
import { AsistentToolCard } from '@/components/launchpad/asistent-tool-card';
import { HeroBlock } from '@/components/launchpad/hero-block';
import { PageShell } from '@/components/ui/page-shell';
import { NaslouchacIcon } from '@/components/icons/tools/naslouchac-icon';
import { ZakazniciIcon } from '@/components/icons/tools/zakaznici-icon';
import { NabidkyIcon } from '@/components/icons/tools/nabidky-icon';
import { FinplanIcon } from '@/components/icons/tools/finplan-icon';
import { ProfilIcon } from '@/components/icons/tools/profil-icon';
import { AdminIcon } from '@/components/icons/tools/admin-icon';
import { NewsletterIcon } from '@/components/icons/tools/newsletter-icon';
import { PojisteniIcon } from '@/components/icons/tools/pojisteni-icon';
import { KalendarIcon } from '@/components/icons/tools/kalendar-icon';
import { InboxIcon } from '@/components/icons/tools/inbox-icon';
import { CrmIcon } from '@/components/icons/tools/crm-icon';
import { KnowledgeIcon } from '@/components/icons/tools/knowledge-icon';

export const metadata = { title: 'Anna' };

export default async function DashboardPage() {
  const advisor = await currentAdvisor();
  const showAdminTile =
    advisor?.role === 'super_admin' || advisor?.role === 'tenant_admin';

  return (
    <PageShell width="wide">
      <HeroBlock />

      <section className="border-t border-border-subtle py-16 md:py-20">
        <div className="mb-8 flex items-baseline justify-between">
          <h2 className="text-h2 text-primary">Nástroje</h2>
          <span className="text-body-sm text-tertiary">Vše dostupné teď</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ToolCard
            title="Naslouchač"
            description="Nahrávka schůzky, přepis a strukturovaná nabídka."
            icon={<NaslouchacIcon />}
            href="/schuzky/nova"
            variant="featured"
          />
          <ToolCard
            title="Finanční plán"
            description="Klient nahraje výpisy, Anna spočítá cashflow, krytí a důchod."
            icon={<FinplanIcon />}
            href="/financni-plan"
          />
          <ToolCard
            title="Zákazníci"
            description="Kontakty, schůzky a nabídky na jednom místě."
            icon={<ZakazniciIcon />}
            href="/zakaznici"
          />
          <ToolCard
            title="Nabídky"
            description="PDF nabídky vytvořené z nahraných schůzek."
            icon={<NabidkyIcon />}
            href="/nabidky"
          />
          <AsistentToolCard />
          <ToolCard
            title="Profil"
            description="Barva, logo, kontaktní údaje."
            icon={<ProfilIcon />}
            href="/profil"
          />
          {showAdminTile && (
            <ToolCard
              title="Admin"
              description="Statistiky, audit, data pro fine-tuning."
              icon={<AdminIcon />}
              href="/admin"
            />
          )}
        </div>
      </section>

      <section className="border-t border-border-subtle py-16 md:py-20">
        <div className="mb-8 flex items-baseline justify-between">
          <h2 className="text-h2 text-primary">Brzy dostupné</h2>
          <span className="text-body-sm text-tertiary">Roadmap 2026</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ToolCard
            title="Pojištění"
            description="Přímé napojení na pojišťovny."
            icon={<PojisteniIcon />}
            variant="disabled"
            badge="Q2 2026"
          />
          <ToolCard
            title="Newsletter"
            description="Posílej zákazníkům personalizované zprávy."
            icon={<NewsletterIcon />}
            variant="disabled"
            badge="Q3 2026"
          />
          <ToolCard
            title="Kalendář"
            description="Plánování schůzek se zákazníky."
            icon={<KalendarIcon />}
            variant="disabled"
            badge="Q3 2026"
          />
          <ToolCard
            title="Inbox"
            description="E-maily, SMS a chaty na jednom místě."
            icon={<InboxIcon />}
            variant="disabled"
            badge="Q3 2026"
          />
          <ToolCard
            title="CRM"
            description="Obchodní pipeline a správa příležitostí."
            icon={<CrmIcon />}
            variant="disabled"
            badge="Q4 2026"
          />
          <ToolCard
            title="Knowledge base"
            description="Produkty, pravidla, skripty."
            icon={<KnowledgeIcon />}
            variant="disabled"
            badge="Q4 2026"
          />
        </div>
      </section>
    </PageShell>
  );
}
