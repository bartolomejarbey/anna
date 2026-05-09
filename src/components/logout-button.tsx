import { logout } from '@/lib/actions/auth';

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-[8px] border border-border-default bg-transparent px-4 text-body font-medium text-primary transition-colors hover:bg-subtle active:scale-[0.98]"
      >
        Odhlásit se
      </button>
    </form>
  );
}
