"use client";

import type { PredictionResult, Signal } from "@/services/predictions";

interface ModelComparisonProps {
  v1: PredictionResult;
  v2: PredictionResult;
}

function SignalBar({ signal }: { signal: Signal }) {
  const pct = Math.round(signal.confidence * 100);
  const isUp = signal.direction === "up";
  const isNeutral = signal.direction === "neutral";
  const color = isNeutral ? "var(--text-3)" : isUp ? "var(--green)" : "var(--red)";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-[var(--text-2)]">{signal.name}</span>
        <span style={{ color }}>{isNeutral ? "—" : isUp ? "↑" : "↓"} {pct}%</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "var(--bg-hover)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color, opacity: 0.8 }}
        />
      </div>
    </div>
  );
}

function ModelPanel({
  result,
  label,
  description,
}: {
  result: PredictionResult;
  label: string;
  description: string;
}) {
  const isUp = result.prediction === "up";
  const confPct = Math.round(result.confidence * 100);

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: "var(--bg-raised)" }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-white">{label}</p>
          <p className="text-[10px] text-[var(--text-3)] mt-0.5">{description}</p>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isUp ? "bg-[var(--green-dim)] text-[var(--green)]" : "bg-[var(--red-dim)] text-[var(--red)]"
          }`}
        >
          {isUp ? "BULLISH" : "BEARISH"}
        </span>
      </div>

      {/* Confidence */}
      <div className="text-center py-2">
        <p className={`num text-4xl font-bold ${isUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
          {confPct}%
        </p>
        <p className="text-[11px] text-[var(--text-3)] mt-1">confidence</p>
      </div>

      {/* Confidence bar */}
      <div className="h-1.5 rounded-full" style={{ background: "var(--bg-hover)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${confPct}%`,
            background: isUp ? "var(--green)" : "var(--red)",
          }}
        />
      </div>

      {/* Signals */}
      <div className="space-y-2.5 pt-1">
        {result.signals.map((s) => (
          <SignalBar key={s.name} signal={s} />
        ))}
      </div>

      <p className="text-[10px] text-[var(--text-3)] border-t border-[var(--border)] pt-3">
        {result.model_version} · {result.signals.length} signals
      </p>
    </div>
  );
}

export default function ModelComparison({ v1, v2 }: ModelComparisonProps) {
  const agree = v1.prediction === v2.prediction;
  const combinedConf = (v1.confidence + v2.confidence) / 2;
  const isUp = v1.prediction === "up";

  return (
    <div className="card p-5" style={{ background: "var(--bg-card)" }}>
      <div className="flex items-center justify-between mb-5">
        <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide uppercase">
          Model Comparison
        </p>
        <span
          className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
            agree
              ? isUp
                ? "bg-[var(--green-dim)] text-[var(--green)]"
                : "bg-[var(--red-dim)] text-[var(--red)]"
              : "bg-[var(--bg-raised)] text-[var(--text-2)]"
          }`}
        >
          {agree ? `Both ${isUp ? "Bullish" : "Bearish"} · ${Math.round(combinedConf * 100)}% avg` : "Models Disagree"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ModelPanel
          result={v1}
          label="Model v1.0 — Technical"
          description="MA Crossover · RSI · MACD · Momentum"
        />
        <ModelPanel
          result={v2}
          label="Model v2.0 — Momentum"
          description="Rate of Change · Volatility · Volume · Trend"
        />
      </div>

      {!agree && (
        <div className="mt-3 p-3 rounded-xl text-xs text-[var(--text-2)]"
          style={{ background: "var(--bg-raised)", borderLeft: "2px solid rgba(255,255,255,0.15)" }}>
          <strong className="text-white">Models disagree</strong> — v1.0 predicts{" "}
          <span className={v1.prediction === "up" ? "text-[var(--green)]" : "text-[var(--red)]"}>
            {v1.prediction}
          </span>{" "}
          while v2.0 predicts{" "}
          <span className={v2.prediction === "up" ? "text-[var(--green)]" : "text-[var(--red)]"}>
            {v2.prediction}
          </span>
          . Consider waiting for alignment before trading.
        </div>
      )}
    </div>
  );
}
