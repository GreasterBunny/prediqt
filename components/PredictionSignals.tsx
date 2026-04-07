import type { Signal } from "@/types";

interface PredictionSignalsProps {
  signals: Signal[];
}

const cfg = {
  up:      { label: "Bullish", color: "text-[var(--green)]", bg: "bg-[var(--green-dim)]", bar: "var(--green)" },
  down:    { label: "Bearish", color: "text-[var(--red)]",   bg: "bg-[var(--red-dim)]",   bar: "var(--red)"   },
  neutral: { label: "Neutral", color: "text-[var(--text-2)]", bg: "bg-[var(--bg-raised)]", bar: "#52525b"     },
};

export default function PredictionSignals({ signals }: PredictionSignalsProps) {
  return (
    <div className="card p-5" style={{ background: "var(--bg-card)" }}>
      <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide mb-4">
        Signal Breakdown
      </p>

      <div className="space-y-4">
        {signals.map((signal) => {
          const c = cfg[signal.direction];
          const pct = Math.round(signal.confidence * 100);

          return (
            <div key={signal.name}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{signal.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.bg} ${c.color}`}>
                    {c.label}
                  </span>
                </div>
                <span className="num text-xs font-medium text-[var(--text-2)]">{pct}%</span>
              </div>

              <div className="h-1 w-full rounded-full bg-[var(--bg-raised)] mb-1.5">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: c.bar }}
                />
              </div>

              <p className="text-[11px] text-[var(--text-3)] leading-relaxed">{signal.reason}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-4 pt-3 border-t border-[var(--border)] text-[10px] text-[var(--text-3)]">
        Weights: MA Crossover 35% · RSI 30% · MACD 25% · Momentum 10%
      </p>
    </div>
  );
}
