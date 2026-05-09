'use client';

import { MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export function AiAsistentRail() {
  return (
    <aside className="flex h-full w-80 flex-col border-l border-border-subtle bg-bg-primary">
      {/* Header */}
      <div className="border-b border-border-subtle px-6 py-5">
        <h2 className="text-[15px] font-semibold text-text-primary">AI asistent</h2>
        <p className="mt-0.5 text-[13px] text-text-tertiary">Pomocník pro vaši práci</p>
      </div>

      {/* Content area */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <EmptyState
          icon={MessageSquare}
          heading="Brzy budete moct chatovat s Annou."
          description="Stay tuned."
          className="py-16"
        />
      </div>
    </aside>
  );
}
