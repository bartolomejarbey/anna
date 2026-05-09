import { logout } from '@/lib/actions/auth';

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center rounded-xl border border-border-subtle bg-bg-primary px-6 text-[15px] font-medium text-text-primary transition-colors hover:bg-bg-tertiary"
      >
        Odhlásit se
      </button>
    </form>
  );
}
