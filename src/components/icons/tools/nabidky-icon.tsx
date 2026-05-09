interface IconProps {
  className?: string;
  size?: number;
}

export function NabidkyIcon({ className, size = 48 }: IconProps) {
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
      <path d="M14 8 H30 L36 14 V40 H14 V8 Z" />
      <path d="M30 8 V14 H36" />
      <path d="M19 32 Q22 30 24 32 T29 32" />
    </svg>
  );
}
