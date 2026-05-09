interface IconProps {
  className?: string;
  size?: number;
}

export function ProfilIcon({ className, size = 48 }: IconProps) {
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
      <circle cx="24" cy="18" r="6" />
      <path d="M12 38 Q12 28 24 28 Q36 28 36 38" />
    </svg>
  );
}
