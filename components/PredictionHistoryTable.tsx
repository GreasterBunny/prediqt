import type { Prediction } from "@/types";

interface PredictionHistoryTableProps {
  history: Array<Prediction & { actual?: "up" | "down" }>;
}

export default function PredictionHistoryTable({ history }: PredictionHistoryTableProps) {
  const sorted = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const resolved = sorted.filter((p) => p.actual !== undefined);
  const correct = resolved.filter((p) => p.prediction === p.actual).length;
  const accuracy = resolved.length > 0 ? Math.round((correct / resolved.length) * 100) : null;
  const recentOutcomes = resolved.slice(0, 10).reverse();

  return (
    <div className="card p-5" style={{ background: "var(--bg-card)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide">
          Prediction History
        </p>
        <div className="flex items-center gap-3">
          {recentOutcomes.length > 0 && (
            <div className="flex items-center gap-1" title="Recent outcomes (oldest → newest)">
              {recentOutcomes.map((p, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full ${p.prediction === p.actual ? "bg-[var(--green)]" : "bg-[var(--red)]"}`}
                />
              ))}
            </div>
          )}
          {accuracy !== null && (
            <span
              className={`num rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                accuracy >= 60
                  ? "bg-[var(--green-dim)] text-[var(--green)]"
                  : accuracy >= 50
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-[var(--red-dim)] text-[var(--red)]"
              }`}
            >
              {accuracy}% accurate
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {["Date", "Prediction", "Confidence", "Actual", "Result"].map((h, i) => (
                <th
                  key={h}
                  className={`pb-2.5 text-[11px] font-medium text-[var(--text-3)] ${i === 4 ? "text-right" : "text-left"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {sorted.map((p) => {
              const isUp = p.prediction === "up";
              const hasActual = p.actual !== undefined;
              const isCorrect = hasActual && p.actual === p.prediction;
              const pct = Math.round(p.confidence * 100);

              return (
                <tr key={p.id} className="hover:bg-[var(--bg-raised)] transition-colors">
                  <td className="num py-3 text-xs text-[var(--text-2)]">
                    {new Date(p.timestamp).toLocaleDateString("en-US", {
                      month: "short", day: "numeric",
                    })}
                  </td>
                  <td className="py-3">
                    <span className={`text-xs font-semibold ${isUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                      {isUp ? "▲ Up" : "▼ Down"}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="num text-xs text-white">{pct}%</span>
                      <div className="h-1 w-10 rounded-full bg-[var(--bg-raised)]">
                        <div
                          className="h-full rounded-full bg-[var(--text-3)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    {hasActual ? (
                      <span className={`text-xs font-medium ${p.actual === "up" ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {p.actual === "up" ? "▲ Up" : "▼ Down"}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-3)]">Pending</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    {hasActual ? (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isCorrect
                            ? "bg-[var(--green-dim)] text-[var(--green)]"
                            : "bg-[var(--red-dim)] text-[var(--red)]"
                        }`}
                      >
                        {isCorrect ? "✓ Correct" : "✗ Missed"}
                      </span>
                    ) : (
                      <span className="text-[var(--text-3)] text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
