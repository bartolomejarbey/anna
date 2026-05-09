interface IconProps {
  className?: string;
  size?: number;
}

export function AdminIcon({ className, size = 48 }: IconProps) {
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
      <line x1="10" y1="36" x2="38" y2="36" />
      <line x1="14" y1="36" x2="14" y2="28" />
      <line x1="22" y1="36" x2="22" y2="20" />
      <line x1="30" y1="36" x2="30" y2="14" />
    </svg>
  );
}
