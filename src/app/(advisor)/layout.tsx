import { AdvisorShell } from '@/components/layout/advisor-shell';
import { currentAdvisor } from '@/lib/auth';

export default async function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const advisor = (await currentAdvisor()) ?? {
    id: 'unknown',
    full_name: 'Poradce',
    email: '',
    role: 'advisor' as const,
    avatar_url: null,
  };

  return <AdvisorShell advisor={advisor}>{children}</AdvisorShell>;
}
