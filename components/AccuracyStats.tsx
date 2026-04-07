import type { AccuracyMetrics } from "@/services/accuracy";

interface AccuracyStatsProps {
  metrics: AccuracyMetrics;
}

function StatCell({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg bg-zinc-800/50 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color ?? "text-white"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-zinc-600">{sub}</p>}
    </div>
  );
}

export default function AccuracyStats({ metrics }: AccuracyStatsProps) {
  const {
    total,
    correct,
    accuracy,
    upAccuracy,
    upTotal,
    downAccuracy,
    downTotal,
    streak,
    streakType,
  } = metrics;

  const accuracyPct = Math.round(accuracy * 100);
  const upPct = Math.round(upAccuracy * 100);
  const downPct = Math.round(downAccuracy * 100);

  const accuracyColor =
    accuracyPct >= 60 ? "text-emerald-400" : accuracyPct >= 50 ? "text-yellow-400" : "text-red-400";

  const streakColor = streakType === "correct" ? "text-emerald-400" : "text-red-400";
  const streakLabel =
    streakType === "correct"
      ? `${streak} correct in a row`
      : streakType === "incorrect"
      ? `${streak} missed in a row`
      : "No streak";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Model Accuracy
        </p>
        {total > 0 && (
          <span className="text-xs text-zinc-600">
            {correct}/{total} resolved
          </span>
        )}
      </div>

      {total === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-600">
          No resolved predictions yet
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCell
            label="Overall"
            value={`${accuracyPct}%`}
            sub="all predictions"
            color={accuracyColor}
          />
          <StatCell
            label="Bullish calls"
            value={upTotal > 0 ? `${upPct}%` : "—"}
            sub={upTotal > 0 ? `${upTotal} predictions` : "no data"}
            color={upTotal > 0 ? (upPct >= 50 ? "text-emerald-400" : "text-red-400") : "text-zinc-500"}
          />
          <StatCell
            label="Bearish calls"
            value={downTotal > 0 ? `${downPct}%` : "—"}
            sub={downTotal > 0 ? `${downTotal} predictions` : "no data"}
            color={downTotal > 0 ? (downPct >= 50 ? "text-emerald-400" : "text-red-400") : "text-zinc-500"}
          />
          <div className="rounded-lg bg-zinc-800/50 p-3">
            <p className="text-xs text-zinc-500">Streak</p>
            <p className={`mt-1 text-xl font-bold ${streakColor}`}>
              {streakType ? streak : "—"}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-600">{streakLabel}</p>
          </div>
        </div>
      )}
    </div>
  );
}
