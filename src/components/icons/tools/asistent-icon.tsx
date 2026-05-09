interface IconProps {
  className?: string;
  size?: number;
}

export function AsistentIcon({ className, size = 48 }: IconProps) {
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
      <path d="M8 14 a4 4 0 0 1 4 -4 H36 a4 4 0 0 1 4 4 V28 a4 4 0 0 1 -4 4 H20 L12 40 V32 a4 4 0 0 1 -4 -4 Z" />
      <line x1="16" y1="21" x2="20" y2="21" />
      <line x1="22" y1="21" x2="26" y2="21" />
      <line x1="28" y1="21" x2="32" y2="21" />
    </svg>
  );
}
