import type { Signal } from "@/types";

interface PredictionSignalsProps {
  signals: Signal[];
}

const directionConfig = {
  up: { label: "Bullish", color: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-400" },
  down: { label: "Bearish", color: "text-red-400", bg: "bg-red-500/10", dot: "bg-red-400" },
  neutral: { label: "Neutral", color: "text-zinc-400", bg: "bg-zinc-800", dot: "bg-zinc-500" },
};

export default function PredictionSignals({ signals }: PredictionSignalsProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-sm">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-zinc-500">
        Signal Breakdown
      </p>

      <div className="space-y-3">
        {signals.map((signal) => {
          const cfg = directionConfig[signal.direction];
          const pct = Math.round(signal.confidence * 100);

          return (
            <div key={signal.name}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                  <span className="text-sm font-medium text-white">{signal.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
                <span className="text-xs font-medium text-zinc-400">{pct}%</span>
              </div>

              {/* Confidence bar */}
              <div className="h-1 w-full rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    signal.direction === "up"
                      ? "bg-emerald-500"
                      : signal.direction === "down"
                      ? "bg-red-500"
                      : "bg-zinc-600"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Reason */}
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{signal.reason}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[10px] text-zinc-700">
        Weighted: MA Crossover 35% · RSI 30% · MACD 25% · Momentum 10%
      </p>
    </div>
  );
}
