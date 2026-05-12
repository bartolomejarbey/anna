import Link from 'next/link';
import { AnnaWordmark } from '@/components/brand/anna-wordmark';
import { Avatar } from '@/components/ui/avatar';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';
import { loginAsDemoAdvisor } from '@/lib/actions/auth';

const SUPER_ADMIN_ID = 'ad0000000099';

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-[420px]">
        <header className="mb-12">
          <AnnaWordmark size="hero" animate />
          <p className="mt-5 text-body-lg text-secondary">Super-admin přístup</p>
        </header>

        <form action={loginAsDemoAdvisor.bind(null, SUPER_ADMIN_ID)}>
          <button
            type="submit"
            className="group flex w-full items-center gap-4 rounded-[14px] border border-border-subtle bg-surface px-4 py-3.5 text-left transition-all duration-200 hover:border-border-default hover:bg-subtle/50"
          >
            <Avatar name="Bartoloměj Rota" size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-medium text-primary">Bartoloměj Rota</p>
              <p className="truncate text-body-sm text-tertiary">Zakladatel · Harotas s.r.o.</p>
            </div>
            <CaretRight
              size={14}
              weight="regular"
              className="text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
            />
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
