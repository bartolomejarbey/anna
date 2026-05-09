interface IconProps {
  className?: string;
  size?: number;
}

export function KnowledgeIcon({ className, size = 48 }: IconProps) {
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
      <path d="M8 14 Q24 8 40 14 V36 Q24 30 8 36 Z" />
      <line x1="24" y1="11" x2="24" y2="33" />
    </svg>
  );
}
