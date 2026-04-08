import Link from "next/link";
import Logo from "./Logo";
import AlertBell from "./AlertBell";

interface HeaderProps {
  isLive?: boolean;
  backHref?: string;
  backLabel?: string;
}

export default function Header({ isLive = false, backHref, backLabel }: HeaderProps) {
  return (
    <header>
      <div className="flex items-center justify-between py-5">
        <div className="flex items-center gap-4">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-raised)] text-[var(--text-2)] hover:text-white hover:bg-[var(--bg-hover)] transition-colors"
              aria-label={backLabel ?? "Back"}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.75"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
          <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
            <Logo size="md" />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/paper-trading"
            className="text-xs font-medium text-[var(--text-2)] hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-[var(--bg-raised)]"
          >
            Paper Trading
          </Link>
          <Link
            href="/backtesting"
            className="text-xs font-medium text-[var(--text-2)] hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-[var(--bg-raised)]"
          >
            Backtesting
          </Link>

          <AlertBell />

          <div className="flex items-center gap-2 rounded-full px-3 py-1.5 ml-1"
            style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
            <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-[var(--green)] animate-pulse" : "bg-[var(--text-3)]"}`} />
            <span className="text-xs font-medium text-[var(--text-2)]">
              {isLive ? "Live" : "Demo"}
            </span>
          </div>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid var(--border)" }} />
    </header>
  );
}
