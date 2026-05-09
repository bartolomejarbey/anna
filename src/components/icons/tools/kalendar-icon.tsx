interface IconProps {
  className?: string;
  size?: number;
}

export function KalendarIcon({ className, size = 48 }: IconProps) {
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
      <line x1="8" y1="24" x2="40" y2="24" />
      <line x1="14" y1="20" x2="14" y2="28" />
      <line x1="24" y1="14" x2="24" y2="34" />
      <line x1="34" y1="20" x2="34" y2="28" />
    </svg>
  );
}
