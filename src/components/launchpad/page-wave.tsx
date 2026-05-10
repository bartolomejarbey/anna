interface PageWaveProps {
  className?: string;
}

export function PageWave({ className }: PageWaveProps) {
  return (
    <div
      aria-hidden
      className={
        className ??
        'pointer-events-none mx-auto mt-32 mb-8 flex w-full max-w-[800px] items-center justify-center text-[var(--color-warmbrown)]'
      }
    >
      <svg
        width="100%"
        height="56"
        viewBox="0 0 800 56"
        preserveAspectRatio="none"
      >
        <path
          d="M0 28 Q 100 4, 200 28 T 400 28 T 600 28 T 800 28"
          stroke="currentColor"
          fill="none"
          strokeWidth="1.75"
          strokeLinecap="round"
          opacity="0.50"
        />
        <path
          d="M0 38 Q 100 14, 200 38 T 400 38 T 600 38 T 800 38"
          stroke="currentColor"
          fill="none"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.38"
        />
        <path
          d="M0 48 Q 100 24, 200 48 T 400 48 T 600 48 T 800 48"
          stroke="currentColor"
          fill="none"
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity="0.26"
        />
      </svg>
    </div>
  );
}
