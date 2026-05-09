interface IconProps {
  className?: string;
  size?: number;
}

export function ZakazniciIcon({ className, size = 48 }: IconProps) {
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
      <circle cx="18" cy="24" r="10" />
      <circle cx="30" cy="24" r="10" />
    </svg>
  );
}
