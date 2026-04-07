import type { Prediction } from "@/types";

interface PredictionHistoryTableProps {
  history: Array<Prediction & { actual?: "up" | "down" }>;
}

export default function PredictionHistoryTable({ history }: PredictionHistoryTableProps) {
  const resolved = history.filter((p) => p.actual !== undefined);
  const correct = resolved.filter((p) => p.prediction === p.actual).length;
  const accuracy = resolved.length > 0 ? Math.round((correct / resolved.length) * 100) : null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Prediction History
        </p>
        {accuracy !== null && (
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-white">
            {accuracy}% accurate
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Prediction</th>
              <th className="pb-2 font-medium">Confidence</th>
              <th className="pb-2 font-medium">Actual</th>
              <th className="pb-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {[...history].reverse().map((p) => {
              const isUp = p.prediction === "up";
              const hasActual = p.actual !== undefined;
              const correct = hasActual && p.actual === p.prediction;

              return (
                <tr key={p.id} className="text-xs">
                  <td className="py-2.5 text-zinc-400">
                    {new Date(p.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`font-medium ${
                        isUp ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {isUp ? "↑ Up" : "↓ Down"}
                    </span>
                  </td>
                  <td className="py-2.5 text-zinc-300">
                    {Math.round(p.confidence * 100)}%
                  </td>
                  <td className="py-2.5">
                    {hasActual ? (
                      <span
                        className={
                          p.actual === "up" ? "text-emerald-400" : "text-red-400"
                        }
                      >
                        {p.actual === "up" ? "↑ Up" : "↓ Down"}
                      </span>
                    ) : (
                      <span className="text-zinc-600">Pending</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    {hasActual ? (
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          correct
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {correct ? "✓" : "✗"}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
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
