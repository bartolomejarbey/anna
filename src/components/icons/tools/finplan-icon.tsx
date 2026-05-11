interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Document + stacked aggregates — represents extracting summary numbers
 * out of bank statements without exposing individual transactions.
 */
export function FinplanIcon({ className, size = 48 }: IconProps) {
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
      <path d="M12 8 H28 L36 16 V40 H12 Z" />
      <path d="M28 8 V16 H36" />
      <path d="M17 24 H28" />
      <path d="M17 30 H31" />
      <path d="M17 36 H24" />
    </svg>
  );
}
