import { FileText } from '@phosphor-icons/react/dist/ssr';
import { EmptyState } from '@/components/ui/empty-state';

export default function NabidkyPage() {
  return (
    <div className="mx-auto w-full max-w-[960px] px-8 py-16">
      <h1 className="text-h1 text-primary mb-12">Nabídky</h1>
      <EmptyState
        icon={FileText}
        heading="Žádná nabídka."
        action={{ label: 'Začít schůzku', href: '/schuzky/nova' }}
      />
    </div>
  );
}
