import { cn } from '@/lib/cn';

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('text-sm font-medium text-text-secondary leading-none', className)}
      {...props}
    >
      {children}
    </label>
  );
}
