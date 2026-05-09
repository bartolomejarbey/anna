import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function ZakazzniciPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold text-text-primary">Zákazníci</h1>
      </div>

      <EmptyState
        icon={Users}
        heading="Žádný zákazník v systému."
        description="Přidávejte je ze stránky schůzky."
      />
    </div>
  );
}
