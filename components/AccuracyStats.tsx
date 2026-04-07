import type { AccuracyMetrics } from "@/services/accuracy";

interface AccuracyStatsProps {
  metrics: AccuracyMetrics;
}

function Stat({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl bg-[var(--bg-raised)]">
      <p className="text-[11px] text-[var(--text-3)]">{label}</p>
      <p className={`num text-2xl font-bold leading-none ${color ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-[10px] text-[var(--text-3)] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AccuracyStats({ metrics }: AccuracyStatsProps) {
  const { total, correct, accuracy, upAccuracy, upTotal, downAccuracy, downTotal, streak, streakType } = metrics;

  const aPct = Math.round(accuracy * 100);
  const uPct = Math.round(upAccuracy * 100);
  const dPct = Math.round(downAccuracy * 100);

  const aColor = aPct >= 60 ? "text-[var(--green)]" : aPct >= 50 ? "text-yellow-400" : "text-[var(--red)]";
  const uColor = upTotal > 0 ? (uPct >= 50 ? "text-[var(--green)]" : "text-[var(--red)]") : "text-[var(--text-3)]";
  const dColor = downTotal > 0 ? (dPct >= 50 ? "text-[var(--green)]" : "text-[var(--red)]") : "text-[var(--text-3)]";
  const sColor = streakType === "correct" ? "text-[var(--green)]" : streakType === "incorrect" ? "text-[var(--red)]" : "text-[var(--text-3)]";

  return (
    <div className="card p-5" style={{ background: "var(--bg-card)" }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide">Model Accuracy</p>
        {total > 0 && (
          <span className="text-[11px] text-[var(--text-3)] num">{correct}/{total} resolved</span>
        )}
      </div>

      {total === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-[var(--text-3)]">No resolved predictions yet</p>
          <p className="text-xs text-[var(--text-3)] mt-1">Predictions resolve after 24 hours</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Overall" value={`${aPct}%`} sub="all predictions" color={aColor} />
          <Stat
            label="Bullish calls"
            value={upTotal > 0 ? `${uPct}%` : "—"}
            sub={upTotal > 0 ? `${upTotal} predictions` : "no data"}
            color={uColor}
          />
          <Stat
            label="Bearish calls"
            value={downTotal > 0 ? `${dPct}%` : "—"}
            sub={downTotal > 0 ? `${downTotal} predictions` : "no data"}
            color={dColor}
          />
          <Stat
            label="Streak"
            value={streakType ? `${streak}` : "—"}
            sub={
              streakType === "correct" ? "correct in a row"
              : streakType === "incorrect" ? "missed in a row"
              : "no streak"
            }
            color={sColor}
          />
        </div>
      )}
    </div>
  );
}
