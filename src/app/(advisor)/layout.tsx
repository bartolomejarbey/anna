import { Shell } from '@/components/layout/shell';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { AiAsistentRail } from '@/components/layout/ai-asistent-rail';
import { currentAdvisor } from '@/lib/auth';

export default async function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const advisor = (await currentAdvisor()) ?? {
    id: 'unknown',
    full_name: 'Poradce',
    email: '',
    role: 'advisor' as const,
    avatar_url: null,
  };

  return (
    <Shell
      sidebar={<Sidebar />}
      main={
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar advisor={advisor} />
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      }
      aiRail={<AiAsistentRail />}
    />
  );
}
