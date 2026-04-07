import Link from "next/link";
import Logo from "./Logo";

interface HeaderProps {
  isLive?: boolean;
  backHref?: string;
  backLabel?: string;
}

export default function Header({ isLive = false, backHref, backLabel }: HeaderProps) {
  return (
    <header className="mx-auto max-w-7xl">
      {/* Top bar */}
      <div className="flex items-center justify-between py-6">
        <Link href="/dashboard" className="transition-opacity hover:opacity-80">
          <Logo size="md" />
        </Link>

        <div className="flex items-center gap-3">
          {/* Live / mock indicator */}
          <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 backdrop-blur-sm">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isLive ? "animate-pulse bg-emerald-400" : "bg-zinc-600"
              }`}
            />
            <span className="text-xs font-medium text-zinc-400">
              {isLive ? "Live" : "Demo"}
            </span>
          </div>
        </div>
      </div>

      {/* Optional back link */}
      {backHref && (
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M9 11L5 7L9 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {backLabel ?? "Back"}
        </Link>
      )}

      {/* Divider */}
      <div className="border-t border-zinc-800/80" />
    </header>
  );
}
