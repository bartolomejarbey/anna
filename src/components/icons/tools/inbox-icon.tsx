interface IconProps {
  className?: string;
  size?: number;
}

export function InboxIcon({ className, size = 48 }: IconProps) {
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
      <path d="M8 28 H16 L20 34 H28 L32 28 H40 V40 H8 Z" />
      <line x1="16" y1="14" x2="32" y2="14" />
      <line x1="20" y1="20" x2="28" y2="20" />
    </svg>
  );
}
