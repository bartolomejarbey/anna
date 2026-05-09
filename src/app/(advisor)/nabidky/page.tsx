import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function NabidkyPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold text-text-primary">Nabídky</h1>
      </div>

      <EmptyState
        icon={FileText}
        heading="Tady budou vaše vygenerované PDF nabídky pro zákazníky."
        description="Nabídka vznikne automaticky po zpracování nahrané schůzky."
      />
    </div>
  );
}
