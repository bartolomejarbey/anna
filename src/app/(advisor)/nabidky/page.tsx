import { FileText } from '@phosphor-icons/react/dist/ssr';
import { EmptyState } from '@/components/ui/empty-state';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';

export default function NabidkyPage() {
  return (
    <PageShell>
      <PageHeader
        title="Nabídky"
        description="PDF nabídky vytvořené z nahraných schůzek se zákazníky."
      />
      <EmptyState
        icon={FileText}
        heading="Anna ještě žádnou nabídku nevyrobila."
        description="Jakmile v Naslouchači dotáhneš schůzku, nabídka přibude tady."
        action={{ label: 'Začít schůzku', href: '/schuzky/nova' }}
      />
    </PageShell>
  );
}
