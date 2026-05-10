import { currentAdvisor } from '@/lib/auth';
import { ToolCard } from '@/components/launchpad/tool-card';
import { AsistentToolCard } from '@/components/launchpad/asistent-tool-card';
import {
  MotionSection,
  MotionSectionGroup,
} from '@/components/launchpad/dashboard-motion';
import { PlatformBackdrop } from '@/components/launchpad/platform-backdrop';
import { CornerAccent } from '@/components/launchpad/corner-accent';
import { HeroBlock } from '@/components/launchpad/hero-block';
import { PageWave } from '@/components/launchpad/page-wave';
import { NaslouchacIcon } from '@/components/icons/tools/naslouchac-icon';
import { ZakazniciIcon } from '@/components/icons/tools/zakaznici-icon';
import { NabidkyIcon } from '@/components/icons/tools/nabidky-icon';
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
    <div className="relative mx-auto w-full max-w-[1280px] px-8 pt-24 pb-32">
      <PlatformBackdrop />
      <CornerAccent position="tr" />
      <CornerAccent position="bl" />

      <HeroBlock />

      <MotionSectionGroup className="relative z-10">
        <MotionSection className="mb-24">
          <span className="anna-section-rule mb-5 block" aria-hidden />
          <h2 className="mb-6 text-h2 text-primary">Nástroje na Anně</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <ToolCard
              title="Naslouchač"
              description="Nahrávka schůzky, přepis a strukturovaná nabídka."
              icon={<NaslouchacIcon />}
              href="/schuzky/nova"
              variant="featured"
            />
            <ToolCard
              title="Zákazníci"
              description="Kontakty, schůzky a nabídky na jednom místě."
              icon={<ZakazniciIcon />}
              href="/zakaznici"
              variant="growth"
            />
            <ToolCard
              title="Nabídky"
              description="PDF nabídky vytvořené z nahraných schůzek."
              icon={<NabidkyIcon />}
              href="/nabidky"
              variant="value"
            />
            <ToolCard
              title="Profil"
              description="Barva, logo, kontaktní údaje."
              icon={<ProfilIcon />}
              href="/profil"
              variant="value"
            />
            <AsistentToolCard />
            {showAdminTile && (
              <ToolCard
                title="Admin"
                description="Statistiky, audit, data pro fine-tuning."
                icon={<AdminIcon />}
                href="/admin"
                variant="growth"
              />
            )}
          </div>
        </MotionSection>

        <MotionSection>
          <span className="anna-section-rule mb-5 block" aria-hidden />
          <h2 className="mb-6 text-h2 text-primary">Anna roste</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <ToolCard
              title="Newsletter"
              description="Posílej zákazníkům personalizované zprávy."
              icon={<NewsletterIcon />}
              variant="disabled"
              badge="Q3 2026"
            />
            <ToolCard
              title="Pojištění"
              description="Přímé napojení na pojišťovny."
              icon={<PojisteniIcon />}
              variant="disabled"
              badge="Q2 2026"
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
        </MotionSection>

        <PageWave />
      </MotionSectionGroup>
    </div>
  );
}
