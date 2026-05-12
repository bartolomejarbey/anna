import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAdvisor } from '@/lib/auth';
import { AnnaWordmark } from '@/components/brand/anna-wordmark';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const advisor = await currentAdvisor();
  if (!advisor || advisor.role !== 'super_admin') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-border-subtle bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[1024px] items-center justify-between px-6 md:px-10">
          <div className="flex items-center gap-3">
            <AnnaWordmark size="sm" />
            <span className="text-tertiary" aria-hidden>
              /
            </span>
            <span className="text-body-sm text-secondary">Admin</span>
          </div>
          <Link
            href="/dashboard"
            className="text-body-sm text-tertiary transition-colors hover:text-primary"
          >
            Zpět na Annu
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
