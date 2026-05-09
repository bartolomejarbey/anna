'use client';

import { useEffect, useState } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { CommandPalette } from '@/components/command-palette';
import { AssistantModal } from '@/components/assistant-modal';
import { AssistantProvider } from '@/components/launchpad/assistant-context';

interface Advisor {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: 'advisor' | 'tenant_admin' | 'super_admin';
}

interface Customer {
  id: string;
  full_name: string;
}

interface RecentMeeting {
  id: string;
  created_at: string;
  customer_name: string | null;
}

interface AdvisorShellProps {
  advisor: Advisor;
  customers: Customer[];
  recentMeetings: RecentMeeting[];
  children: React.ReactNode;
}

export function AdvisorShell({ advisor, customers, recentMeetings, children }: AdvisorShellProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const showAdmin = advisor.role === 'super_admin' || advisor.role === 'tenant_admin';

  return (
    <AssistantProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-canvas">
        <Topbar advisor={advisor} onOpenPalette={() => setPaletteOpen(true)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        customers={customers}
        recentMeetings={recentMeetings}
        showAdmin={showAdmin}
      />
      <AssistantModal />
    </AssistantProvider>
  );
}
