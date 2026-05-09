'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { AiAsistentRail } from '@/components/layout/ai-asistent-rail';

interface Advisor {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: 'advisor' | 'tenant_admin' | 'super_admin';
}

interface AdvisorShellProps {
  advisor: Advisor;
  children: React.ReactNode;
}

export function AdvisorShell({ advisor, children }: AdvisorShellProps) {
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAssistantOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-canvas">
      <div className="hidden lg:flex h-full shrink-0">
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar advisor={advisor} onOpenAssistant={() => setAssistantOpen(true)} />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>

      <AiAsistentRail open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}
