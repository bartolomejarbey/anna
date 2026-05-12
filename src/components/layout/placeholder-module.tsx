import { StatusPill } from '@/components/ui/status-pill';
import { PageShell } from '@/components/ui/page-shell';

type Quarter = 'Q2 2026' | 'Q3 2026' | 'Q4 2026';

interface PlaceholderModuleProps {
  title: string;
  quarter: Quarter;
  description: string;
}

export function PlaceholderModule({ title, quarter, description }: PlaceholderModuleProps) {
  return (
    <PageShell width="narrow">
      <div className="flex min-h-[70vh] flex-col justify-center py-24">
        <div className="flex flex-col gap-5">
          <div>
            <StatusPill tone="accent">{quarter}</StatusPill>
          </div>
          <h1 className="text-h1 text-primary">{title}</h1>
          <p className="max-w-[60ch] text-body-lg text-secondary">{description}</p>
        </div>
      </div>
    </PageShell>
  );
}
