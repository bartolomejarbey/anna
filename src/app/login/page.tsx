import Link from 'next/link';

const DEMO_ADVISORS = [
  { id: 'ad0000000001', name: 'Karel Novák', email: 'karel.novak@4fin.cz', role: 'Senior poradce' },
  { id: 'ad0000000002', name: 'Petra Svobodová', email: 'petra.svobodova@4fin.cz', role: 'Poradkyně' },
  { id: 'ad0000000003', name: 'Tomáš Dvořák', email: 'tomas.dvorak@4fin.cz', role: 'Poradce' },
  { id: 'ad0000000004', name: 'Eva Černá', email: 'eva.cerna@4fin.cz', role: 'Senior poradkyně' },
  { id: 'ad0000000005', name: 'Martin Procházka', email: 'martin.prochazka@4fin.cz', role: 'Poradce' },
] as const;

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg-secondary px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-12 text-center">
          <h1 className="text-[40px] font-semibold tracking-tight text-text-primary">Anna</h1>
          <p className="mt-3 text-[15px] text-text-secondary">
            Vyberte poradce pro demo přihlášení.
          </p>
        </div>

        <div className="space-y-2">
          {DEMO_ADVISORS.map((advisor) => (
            <Link
              key={advisor.id}
              href="/dashboard"
              className="group flex items-center gap-4 rounded-2xl border border-border-subtle bg-bg-primary px-5 py-4 transition-colors hover:bg-bg-tertiary"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg-secondary text-[14px] font-semibold text-text-primary">
                {initials(advisor.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-text-primary">
                  {advisor.name}
                </p>
                <p className="truncate text-[13px] text-text-tertiary">
                  {advisor.role} · {advisor.email}
                </p>
              </div>
              <span
                aria-hidden
                className="text-text-tertiary transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-center text-[13px] text-text-tertiary">
          4FIN HOLDING · demo prostředí
        </p>
      </div>
    </div>
  );
}
