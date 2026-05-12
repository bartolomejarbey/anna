import Link from 'next/link';
import { AnnaWordmark } from '@/components/brand/anna-wordmark';
import { LoginAdvisorCard, type AvatarTint } from '@/components/login/login-advisor-card';

const DEMO_ADVISORS: Array<{
  id: string;
  name: string;
  role: string;
  tint: AvatarTint;
}> = [
  { id: 'ad0000000001', name: 'Karel Novák', role: 'Senior poradce', tint: 'cream' },
  { id: 'ad0000000002', name: 'Petra Svobodová', role: 'Poradkyně', tint: 'sage' },
  { id: 'ad0000000003', name: 'Tomáš Dvořák', role: 'Poradce', tint: 'ochre' },
  { id: 'ad0000000004', name: 'Eva Černá', role: 'Senior poradkyně', tint: 'wine' },
  { id: 'ad0000000005', name: 'Martin Procházka', role: 'Poradce', tint: 'inset' },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-[420px]">
        <header className="mb-12">
          <AnnaWordmark size="hero" animate />
          <p className="mt-5 text-body-lg text-secondary">Pro finanční poradce</p>
        </header>

        <div className="flex flex-col gap-2">
          {DEMO_ADVISORS.map((advisor) => (
            <LoginAdvisorCard
              key={advisor.id}
              advisorId={advisor.id}
              name={advisor.name}
              role={advisor.role}
              tint={advisor.tint}
            />
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <p className="text-body-sm text-tertiary">4FIN HOLDING · demo</p>
          <Link
            href="/login/admin"
            className="text-body-sm text-tertiary transition-colors hover:text-accent"
          >
            Bartoloměj?
          </Link>
        </div>
      </div>
    </div>
  );
}
