import { cn } from '@/lib/cn';

interface ShellProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  aiRail: React.ReactNode;
  className?: string;
}

export function Shell({ sidebar, main, aiRail, className }: ShellProps) {
  return (
    <div className={cn('flex h-screen w-full overflow-hidden bg-bg-primary', className)}>
      {/* Sidebar — fixed 240px */}
      <div className="hidden lg:flex h-full shrink-0">
        {sidebar}
      </div>

      {/* Main content area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {main}
      </main>

      {/* AI rail — fixed 320px, desktop only */}
      <div className="hidden lg:flex h-full shrink-0">
        {aiRail}
      </div>
    </div>
  );
}
