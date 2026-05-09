import { cn } from '@/lib/cn';

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('text-caption text-tertiary', className)}
      {...props}
    >
      {children}
    </label>
  );
}
