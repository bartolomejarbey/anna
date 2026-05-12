import { cn } from '@/lib/cn';

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('text-body-sm font-medium text-primary', className)}
      {...props}
    >
      {children}
    </label>
  );
}
