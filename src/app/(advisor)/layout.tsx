// TODO: replace mock advisor with real auth.user fetch in Phase 2 final
import { Shell } from '@/components/layout/shell';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { AiAsistentRail } from '@/components/layout/ai-asistent-rail';

const mockAdvisor = {
  id: 'mock',
  full_name: 'Karel Novák',
  email: 'karel.novak@4fin.cz',
  avatar_url: null,
  role: 'advisor' as const,
};

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell
      sidebar={<Sidebar />}
      main={
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar advisor={mockAdvisor} />
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      }
      aiRail={<AiAsistentRail />}
    />
  );
}
