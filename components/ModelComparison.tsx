"use client";

import { useState } from "react";
import type { PredictionResult, Signal } from "@/services/predictions";
import { getSignalInfo } from "@/lib/signal-descriptions";

interface ModelComparisonProps {
  v1: PredictionResult;
  v2: PredictionResult;
}

function InfoIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="6" stroke="currentColor" strokeWidth="1"/>
      <path d="M6.5 6v3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="6.5" cy="3.75" r="0.75" fill="currentColor"/>
    </svg>
  );
}

function SignalBar({ signal }: { signal: Signal }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(signal.confidence * 100);
  const isUp = signal.direction === "up";
  const isNeutral = signal.direction === "neutral";
  const color = isNeutral ? "var(--text-3)" : isUp ? "var(--green)" : "var(--red)";
  const textClass = isNeutral ? "text-[var(--text-3)]" : isUp ? "text-[var(--green)]" : "text-[var(--red)]";
  const info = getSignalInfo(signal.name);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[var(--text-2)] truncate">{signal.name}</span>
          {info && (
            <button
              onClick={() => setOpen((o) => !o)}
              className="text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors flex-shrink-0"
              aria-label="Explain"
            >
              <InfoIcon />
            </button>
          )}
        </div>
        <span className={`flex-shrink-0 font-medium ${textClass}`}>
          {isNeutral ? "—" : isUp ? "↑" : "↓"} {pct}%
        </span>
      </div>

      <div className="h-1.5 rounded-full" style={{ background: "var(--bg-hover)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color, opacity: 0.85 }}
        />
      </div>

      {/* Inline explanation */}
      {open && info && (
        <div
          className="rounded-lg p-2.5 mt-1 text-[10px] text-[var(--text-2)] leading-relaxed space-y-1.5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p><span className="font-semibold text-white">{info.name}</span> · <span className="text-[var(--text-3)]">{info.weight}</span></p>
          <p>{info.what}</p>
          <p className="text-[var(--text-3)] italic">{info.analogy}</p>
        </div>
      )}
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
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-white">{label}</p>
          <p className="text-[10px] text-[var(--text-3)] mt-0.5">{description}</p>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
            isUp ? "bg-[var(--green-dim)] text-[var(--green)]" : "bg-[var(--red-dim)] text-[var(--red)]"
          }`}
        >
          {isUp ? "BULLISH" : "BEARISH"}
        </span>
      </div>

      {/* Confidence */}
      <div className="text-center py-1">
        <p className={`num text-4xl font-bold ${isUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
          {confPct}%
        </p>
        <p className="text-[11px] text-[var(--text-3)] mt-1">confidence</p>
      </div>

      <div className="h-1.5 rounded-full" style={{ background: "var(--bg-hover)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${confPct}%`, background: isUp ? "var(--green)" : "var(--red)" }}
        />
      </div>

      {/* Signals with descriptions */}
      <div className="space-y-3 pt-1">
        <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wide font-medium">
          Signals <span className="normal-case text-[var(--text-3)]">· tap ⓘ to explain</span>
        </p>
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
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide uppercase">
            Model Comparison
          </p>
          <p className="text-[10px] text-[var(--text-3)] mt-0.5">
            Two independent models — technical patterns vs momentum factors
          </p>
        </div>
        <span
          className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
            agree
              ? isUp
                ? "bg-[var(--green-dim)] text-[var(--green)]"
                : "bg-[var(--red-dim)] text-[var(--red)]"
              : "bg-[var(--bg-raised)] text-[var(--text-2)]"
          }`}
        >
          {agree
            ? `⚡ Aligned ${isUp ? "Bullish" : "Bearish"} · ${Math.round(combinedConf * 100)}% avg`
            : "⚠ Mixed Signals"}
        </span>
      </div>

      {/* What alignment means */}
      <div
        className="mb-5 mt-3 rounded-xl p-3 text-[11px] text-[var(--text-2)] leading-relaxed"
        style={{ background: "var(--bg-raised)" }}
      >
        {agree
          ? `Both the Technical model (v1.0) and Momentum model (v2.0) are predicting the stock moves ${
              isUp ? "up" : "down"
            }. When two independent methods reach the same conclusion, the signal is generally considered stronger and more reliable.`
          : "The two models are pointing in opposite directions, which signals uncertainty. The Technical model sees different patterns than the Momentum model. Many traders wait for alignment before acting."}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ModelPanel
          result={v1}
          label="Model v1.0 — Technical"
          description="Moving averages, RSI, MACD, price momentum"
        />
        <ModelPanel
          result={v2}
          label="Model v2.0 — Momentum"
          description="Rate of change, Bollinger bands, volume, trend"
        />
      </div>

      {!agree && (
        <div
          className="mt-3 p-3 rounded-xl text-xs text-[var(--text-2)]"
          style={{ background: "var(--bg-raised)", borderLeft: "2px solid rgba(255,180,0,0.3)" }}
        >
          <strong className="text-white">Consider waiting</strong> — v1.0 predicts{" "}
          <span className={v1.prediction === "up" ? "text-[var(--green)]" : "text-[var(--red)]"}>
            {v1.prediction}
          </span>{" "}
          while v2.0 predicts{" "}
          <span className={v2.prediction === "up" ? "text-[var(--green)]" : "text-[var(--red)]"}>
            {v2.prediction}
          </span>
          . Alignment between models historically improves prediction reliability.
        </div>
      )}
    </div>
  );
}
