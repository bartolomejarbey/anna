import { Mic } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function SchuzkyPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold text-text-primary">Schůzky</h1>
      </div>

      <EmptyState
        icon={Mic}
        heading="Zatím tu nemáte žádnou schůzku."
        description="Nahrávat můžete nahoře vpravo."
        action={{
          label: 'Nahrát schůzku',
          href: '/schuzky/nova',
        }}
      />
    </div>
  );
}
