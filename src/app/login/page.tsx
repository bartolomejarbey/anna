import { loginAsDemoAdvisor } from '@/lib/actions/auth';

const DEMO_ADVISORS = [
  { id: 'ad0000000001', name: 'Karel Novák', email: 'karel.novak@4fin.cz', role: 'Senior poradce' },
  { id: 'ad0000000002', name: 'Petra Svobodová', email: 'petra.svobodova@4fin.cz', role: 'Poradkyně' },
  { id: 'ad0000000003', name: 'Tomáš Dvořák', email: 'tomas.dvorak@4fin.cz', role: 'Poradce' },
  { id: 'ad0000000004', name: 'Eva Černá', email: 'eva.cerna@4fin.cz', role: 'Senior poradkyně' },
  { id: 'ad0000000005', name: 'Martin Procházka', email: 'martin.prochazka@4fin.cz', role: 'Poradce' },
  { id: 'ad0000000099', name: 'Bartoloměj Rota', email: 'bartolomej@arbey.cz', role: 'Super admin' },
] as const;

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-12">
          <h1 className="text-display text-primary">Anna</h1>
        </div>

        <div className="flex flex-col gap-2">
          {DEMO_ADVISORS.map((advisor) => (
            <form key={advisor.id} action={loginAsDemoAdvisor.bind(null, advisor.id)}>
              <button
                type="submit"
                className="flex w-full items-center justify-between rounded-[12px] border border-border-subtle bg-surface px-5 py-4 text-left transition-colors hover:border-border-default"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-primary">{advisor.name}</p>
                  <p className="truncate text-body-sm text-tertiary">{advisor.role}</p>
                </div>
                <span aria-hidden className="text-tertiary">
                  →
                </span>
              </button>
            </form>
          ))}
        </div>

        <p className="mt-10 text-body-sm text-tertiary">4FIN HOLDING · demo</p>
      </div>
    </div>
  );
}
