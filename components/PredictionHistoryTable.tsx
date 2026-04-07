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

  // Last 10 resolved outcomes for streak dots
  const recentOutcomes = resolved.slice(0, 10).reverse();

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Prediction History
        </p>

        <div className="flex items-center gap-3">
          {/* Streak dots */}
          {recentOutcomes.length > 0 && (
            <div className="flex items-center gap-1">
              {recentOutcomes.map((p, i) => {
                const isCorrect = p.prediction === p.actual;
                return (
                  <span
                    key={i}
                    title={isCorrect ? "Correct" : "Incorrect"}
                    className={`h-2 w-2 rounded-full ${
                      isCorrect ? "bg-emerald-400" : "bg-red-400"
                    }`}
                  />
                );
              })}
            </div>
          )}

          {accuracy !== null && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                accuracy >= 60
                  ? "bg-emerald-500/10 text-emerald-400"
                  : accuracy >= 50
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {accuracy}% accurate
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Prediction</th>
              <th className="pb-2 font-medium">Confidence</th>
              <th className="pb-2 font-medium">Actual</th>
              <th className="pb-2 font-medium text-right">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {sorted.map((p) => {
              const isUp = p.prediction === "up";
              const hasActual = p.actual !== undefined;
              const isCorrect = hasActual && p.actual === p.prediction;

              return (
                <tr key={p.id} className="group text-xs transition-colors hover:bg-zinc-800/20">
                  <td className="py-2.5 text-zinc-400">
                    {new Date(p.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="py-2.5">
                    <span className={`font-medium ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                      {isUp ? "↑ Up" : "↓ Down"}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-300">{Math.round(p.confidence * 100)}%</span>
                      <div className="h-1 w-12 rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-zinc-500"
                          style={{ width: `${Math.round(p.confidence * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5">
                    {hasActual ? (
                      <span className={p.actual === "up" ? "text-emerald-400" : "text-red-400"}>
                        {p.actual === "up" ? "↑ Up" : "↓ Down"}
                      </span>
                    ) : (
                      <span className="text-zinc-600">Pending</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    {hasActual ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isCorrect
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {isCorrect ? "✓ Correct" : "✗ Missed"}
                      </span>
                    ) : (
                      <span className="text-zinc-700">—</span>
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
