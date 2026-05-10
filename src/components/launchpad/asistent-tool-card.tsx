'use client';

import { ToolCard } from '@/components/launchpad/tool-card';
import { AsistentIcon } from '@/components/icons/tools/asistent-icon';
import { useAssistant } from '@/components/launchpad/assistant-context';

export function AsistentToolCard() {
  const { openAssistant } = useAssistant();

  return (
    <ToolCard
      title="Asistent"
      description="Zeptej se Anny. Pomáhá s textem, klienty, formulacemi."
      icon={<AsistentIcon />}
      onClick={() => openAssistant()}
      variant="featured"
    />
  );
}
