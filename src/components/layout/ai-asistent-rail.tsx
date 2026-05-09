'use client';

import { AiAsistentChat } from '@/components/ai-asistent-chat';

export function AiAsistentRail() {
  return (
    <aside className="flex h-full w-80 flex-col border-l border-border-subtle bg-bg-primary">
      <div className="border-b border-border-subtle px-6 py-5">
        <h2 className="text-[15px] font-semibold text-text-primary">Anna</h2>
        <p className="mt-0.5 text-[13px] text-text-tertiary">AI asistent finančního poradce</p>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <AiAsistentChat />
      </div>
    </aside>
  );
}
