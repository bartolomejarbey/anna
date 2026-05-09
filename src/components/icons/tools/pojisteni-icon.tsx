interface IconProps {
  className?: string;
  size?: number;
}

export function PojisteniIcon({ className, size = 48 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path d="M24 8 L12 14 V24 Q12 36 24 42 Q36 36 36 24 V14 Z" />
      <path d="M19 24 L23 28 L30 20" />
    </svg>
  );
}
