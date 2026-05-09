import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-secondary">
      <header className="border-b border-border-subtle bg-bg-primary">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-8">
          <h1 className="text-[15px] font-semibold text-text-primary">Anna · Admin</h1>
          <Link
            href="/dashboard"
            className="text-[13px] text-text-secondary hover:text-text-primary transition-colors"
          >
            Zpět do aplikace
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1280px] px-8 py-12">{children}</main>
    </div>
  );
}
