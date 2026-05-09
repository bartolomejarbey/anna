interface IconProps {
  className?: string;
  size?: number;
}

export function NaslouchacIcon({ className, size = 48 }: IconProps) {
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
      <line x1="12" y1="22" x2="12" y2="26" />
      <line x1="18" y1="16" x2="18" y2="32" />
      <line x1="24" y1="10" x2="24" y2="38" />
      <line x1="30" y1="16" x2="30" y2="32" />
      <line x1="36" y1="22" x2="36" y2="26" />
    </svg>
  );
}
