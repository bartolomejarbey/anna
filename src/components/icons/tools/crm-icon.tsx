interface IconProps {
  className?: string;
  size?: number;
}

export function CrmIcon({ className, size = 48 }: IconProps) {
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
      <circle cx="14" cy="14" r="6" />
      <circle cx="34" cy="34" r="6" />
      <line x1="18.5" y1="18.5" x2="29.5" y2="29.5" />
    </svg>
  );
}
