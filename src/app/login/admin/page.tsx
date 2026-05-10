import Link from 'next/link';
import { AnnaWordmark } from '@/components/brand/anna-wordmark';
import { loginAsDemoAdvisor } from '@/lib/actions/auth';
import { PlatformBackdrop } from '@/components/launchpad/platform-backdrop';

const SUPER_ADMIN_ID = 'ad0000000099';

export default function AdminLoginPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-canvas px-6 py-16">
      <PlatformBackdrop />

      <div className="relative z-10 w-full max-w-sm">
        <header className="mb-12">
          <AnnaWordmark size="md" animate />
          <p className="mt-5 text-caption text-tertiary">Super-admin přístup</p>
        </header>

        <form action={loginAsDemoAdvisor.bind(null, SUPER_ADMIN_ID)}>
          <button
            type="submit"
            className="group flex w-full items-center gap-5 rounded-[14px] border border-border-subtle bg-surface px-5 py-4 text-left transition-all duration-200 hover:-translate-y-[1px] hover:border-accent"
          >
            <div
              className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[20px] bg-accent-muted"
              aria-hidden
            >
              <svg
                viewBox="0 0 24 24"
                width={28}
                height={28}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent opacity-80"
              >
                <path d="M12 2 L20 6 V12 C20 17 16 21 12 22 C8 21 4 17 4 12 V6 Z" />
                <path d="M9 12 L11 14 L15 10" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-h3 text-primary">Bartoloměj Rota</p>
              <p className="truncate text-body-sm text-tertiary">Zakladatel · Harotas s.r.o.</p>
            </div>
            <span
              aria-hidden
              className="text-[18px] text-tertiary transition-colors group-hover:text-accent"
            >
              →
            </span>
          </button>
        </form>

        <div className="mt-10">
          <Link
            href="/login"
            className="text-body-sm text-tertiary transition-colors hover:text-accent"
          >
            ← Zpět na demo poradce
          </Link>
        </div>
      </div>
    </div>
  );
}
