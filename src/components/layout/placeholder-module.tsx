import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Quarter = 'Q2 2026' | 'Q3 2026' | 'Q4 2026';

interface PlaceholderModuleProps {
  title: string;
  quarter: Quarter;
  description: string;
}

export function PlaceholderModule({ title, quarter, description }: PlaceholderModuleProps) {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="mx-auto w-full max-w-md text-center">
        <Badge variant="quarter" className="mb-6 inline-flex">
          {quarter}
        </Badge>
        <h1 className="text-3xl font-semibold text-text-primary">{title}</h1>
        <p className="mt-4 text-[15px] text-text-secondary">{description}</p>
        <div className="mt-10">
          <Button variant="secondary" disabled>
            Dejte mi vědět, až bude hotovo
          </Button>
        </div>
      </div>
    </div>
  );
}
