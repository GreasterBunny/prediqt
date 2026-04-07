interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}

const sizes = {
  sm: { icon: 20, text: "text-lg", gap: "gap-2" },
  md: { icon: 28, text: "text-2xl", gap: "gap-2.5" },
  lg: { icon: 40, text: "text-4xl", gap: "gap-3" },
};

export default function Logo({ size = "md", showWordmark = true }: LogoProps) {
  const s = sizes[size];

  return (
    <div className={`flex items-center ${s.gap}`}>
      {/* Icon mark */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
      >
        {/* Bottom chevron — faintest */}
        <path
          d="M4 26 L14 16 L24 26"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.18"
        />
        {/* Middle chevron — medium */}
        <path
          d="M4 19 L14 9 L24 19"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.48"
        />
        {/* Top chevron — signal (emerald) */}
        <path
          d="M4 12 L14 2 L24 12"
          stroke="#34d399"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Signal dot at apex */}
        <circle cx="14" cy="2" r="2" fill="#34d399" />
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <span
          className={`${s.text} font-bold tracking-tight text-white`}
          style={{ letterSpacing: "-0.02em" }}
        >
          Prediqt
        </span>
      )}
    </div>
  );
}
