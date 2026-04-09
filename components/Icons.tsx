/**
 * Prediqt Icon Library
 * All icons use a 16×16 viewBox, 1.5px stroke, round caps and joins.
 * Pass `size` to scale, `className` for color/style overrides.
 */

interface IconProps {
  size?: number;
  className?: string;
}

const defaults = {
  fill: "none",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// ─── Direction / Trend ───────────────────────────────────────────────────────

/** Upward chevron arrow — bullish signals, table direction */
export function IconArrowUp({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M8 12.5V3.5M4.5 7 8 3.5 11.5 7" stroke="currentColor" {...defaults} />
    </svg>
  );
}

/** Downward chevron arrow — bearish signals, table direction */
export function IconArrowDown({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M8 3.5v9M4.5 9 8 12.5l3.5-3.5" stroke="currentColor" {...defaults} />
    </svg>
  );
}

/** Filled triangle up — compact bullish indicator on cards/badges */
export function IconTriangleUp({ size = 10, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="currentColor" className={className}>
      <path d="M5 1.5 9 8.5H1z" />
    </svg>
  );
}

/** Filled triangle down — compact bearish indicator on cards/badges */
export function IconTriangleDown({ size = 10, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="currentColor" className={className}>
      <path d="M5 8.5 1 1.5h8z" />
    </svg>
  );
}

/** Arrow pointing right — navigation, pipeline flow */
export function IconArrowRight({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M3 8h10M9 4.5 12.5 8 9 11.5" stroke="currentColor" {...defaults} />
    </svg>
  );
}

/** Chevron down — expand/collapse */
export function IconChevronDown({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" {...defaults} />
    </svg>
  );
}

/** Chevron up — collapse */
export function IconChevronUp({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M4 10l4-4 4 4" stroke="currentColor" {...defaults} />
    </svg>
  );
}

// ─── Status / Outcome ────────────────────────────────────────────────────────

/** Checkmark — correct prediction, success state */
export function IconCheck({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M3 8.5l3 3 7-7" stroke="currentColor" {...defaults} />
    </svg>
  );
}

/** X mark — incorrect prediction, failure state */
export function IconX({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" {...defaults} />
    </svg>
  );
}

/** Warning triangle — stale data, mixed signals, caution */
export function IconWarning({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M8 2 1.5 13.5h13L8 2z" stroke="currentColor" {...defaults} />
      <path d="M8 6.5v3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.75" fill="currentColor" />
    </svg>
  );
}

/** Filled dot — live indicator, status */
export function IconDot({ size = 8, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" fill="currentColor" className={className}>
      <circle cx="4" cy="4" r="3" />
    </svg>
  );
}

// ─── Signals & Analysis ───────────────────────────────────────────────────────

/** Lightning bolt — model alignment, high-confidence signal (used in gold) */
export function IconLightning({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M9 2 4.5 8.5H8L7 14l4.5-6.5H8L9 2z" stroke="currentColor" {...defaults} />
    </svg>
  );
}

/** Info circle — explain / learn more */
export function IconInfo({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth={1.25} />
      <path d="M8 7.5V11" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" />
      <circle cx="8" cy="5.25" r="0.75" fill="currentColor" />
    </svg>
  );
}

/** Target / bullseye — resolve predictions */
export function IconTarget({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth={1.25} />
      <circle cx="8" cy="8" r="3.25" stroke="currentColor" strokeWidth={1.25} />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}

/** Line chart — backtesting, price chart */
export function IconLineChart({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M1.5 12 5 7.5l3 2L12 4.5l2.5 2" stroke="currentColor" {...defaults} />
      <path d="M1.5 14.5h13" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" />
    </svg>
  );
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/** Play button — run bot, execute pipeline */
export function IconPlay({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M4.5 3.5v9l8-4.5-8-4.5z" stroke="currentColor" {...defaults} />
    </svg>
  );
}

/** Refresh / rotate CW — refresh data, retry */
export function IconRefresh({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M13.5 8A5.5 5.5 0 1 1 10 3" stroke="currentColor" {...defaults} />
      <path d="M10 1.5v3h3" stroke="currentColor" {...defaults} />
    </svg>
  );
}

/** Rotate CCW — reset experiment */
export function IconRotateCcw({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M2.5 8A5.5 5.5 0 1 0 6 3" stroke="currentColor" {...defaults} />
      <path d="M6 1.5v3H3" stroke="currentColor" {...defaults} />
    </svg>
  );
}

/** Repeat / cycle arrows — prediction flip alert */
export function IconRepeat({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M2 5.5h10a2 2 0 0 1 2 2v1" stroke="currentColor" {...defaults} />
      <path d="M14 10.5H4a2 2 0 0 1-2-2v-1" stroke="currentColor" {...defaults} />
      <path d="M10 3l2 2.5-2 2.5" stroke="currentColor" {...defaults} />
      <path d="M6 8l-2 2.5 2 2.5" stroke="currentColor" {...defaults} />
    </svg>
  );
}

/** Download arrow — fetch prices */
export function IconDownload({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M8 2v8M5 7.5l3 3 3-3" stroke="currentColor" {...defaults} />
      <path d="M2.5 11.5v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1" stroke="currentColor" {...defaults} />
    </svg>
  );
}

// ─── Entities & Objects ───────────────────────────────────────────────────────

/** Bell — notifications, alerts */
export function IconBell({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5V9L2 11h12l-1.5-2V6A4.5 4.5 0 0 0 8 1.5z"
        stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 11a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" />
    </svg>
  );
}

/** Briefcase — trade closed alert */
export function IconBriefcase({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1.5" y="5.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth={1.25} />
      <path d="M5.5 5.5V4a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 10.5 4v1.5" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" />
      <path d="M1.5 9.5h13" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" />
    </svg>
  );
}

/** Database cylinder — store / backfill data */
export function IconDatabase({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <ellipse cx="8" cy="4.5" rx="5" ry="2" stroke="currentColor" strokeWidth={1.25} />
      <path d="M3 4.5v7c0 1.1 2.24 2 5 2s5-.9 5-2v-7" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" />
      <path d="M3 8c0 1.1 2.24 2 5 2s5-.9 5-2" stroke="currentColor" strokeWidth={1.25} />
    </svg>
  );
}

/** CPU / chip — prediction engine */
export function IconCpu({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth={1.25} />
      <path d="M6 4V2M8 4V2M10 4V2M6 14v-2M8 14v-2M10 14v-2M4 6H2M4 8H2M4 10H2M14 6h-2M14 8h-2M14 10h-2"
        stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" />
    </svg>
  );
}

/** Bot / robot — paper trading automation */
export function IconBot({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="2.5" y="6" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth={1.25} />
      <path d="M5.5 9.5h.01M10.5 9.5h.01" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <path d="M6 12h4" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" />
      <path d="M8 6V3.5" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" />
      <circle cx="8" cy="3" r="0.75" fill="currentColor" />
      <path d="M5 6V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth={1.25} />
    </svg>
  );
}

/** Clock — cron schedule, timing */
export function IconClock({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth={1.25} />
      <path d="M8 4.5v4l2.5 1.5" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Layers / stack — news sentiment, multiple data sources */
export function IconLayers({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M2 5.5l6-3 6 3-6 3-6-3z" stroke="currentColor" {...defaults} />
      <path d="M2 9l6 3 6-3" stroke="currentColor" {...defaults} />
      <path d="M2 12.5l6 3 6-3" stroke="currentColor" {...defaults} />
    </svg>
  );
}

/** Activity / pulse — live data, pipeline running */
export function IconActivity({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M1 8h2.5l2-5 3 9.5 2-4.5H15" stroke="currentColor" {...defaults} />
    </svg>
  );
}
