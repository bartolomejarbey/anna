interface IconProps {
  className?: string;
  size?: number;
}

export function NewsletterIcon({ className, size = 48 }: IconProps) {
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
      <path d="M8 24 L40 12 L26 40 L21 27 L8 24 Z" />
      <path d="M21 27 L40 12" />
    </svg>
  );
}
