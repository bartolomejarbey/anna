import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAdvisor } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const advisor = await currentAdvisor();
  if (!advisor || advisor.role !== 'super_admin') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-border-subtle bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-[960px] items-center justify-between px-8">
          <h1 className="text-body font-medium text-primary">Anna · Admin</h1>
          <Link
            href="/dashboard"
            className="text-body-sm text-secondary transition-colors hover:text-primary"
          >
            Zpět
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[960px] px-8 py-16">{children}</main>
    </div>
  );
}
