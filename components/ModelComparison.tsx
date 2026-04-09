"use client";

import { useState } from "react";
import type { PredictionResult, Signal } from "@/services/predictions";
import { getSignalInfo } from "@/lib/signal-descriptions";
import { IconInfo, IconArrowUp, IconArrowDown, IconLightning, IconWarning } from "./Icons";

interface ModelComparisonProps {
  v1: PredictionResult;
  v2: PredictionResult;
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
              <IconInfo size={12} />
            </button>
          )}
        </div>
        <span className={`flex-shrink-0 font-medium flex items-center gap-1 ${textClass}`}>
          {!isNeutral && (isUp
            ? <IconArrowUp size={10} />
            : <IconArrowDown size={10} />)}
          <span className="num">{pct}%</span>
        </span>
      </div>

      <div className="h-1.5 rounded-full" style={{ background: "var(--bg-hover)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, opacity: 0.85 }} />
      </div>

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

function ModelPanel({ result, label, description }: {
  result: PredictionResult;
  label: string;
  description: string;
}) {
  const isUp = result.prediction === "up";
  const confPct = Math.round(result.confidence * 100);

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: "var(--bg-raised)" }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-white">{label}</p>
          <p className="text-[10px] text-[var(--text-3)] mt-0.5">{description}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
          isUp ? "bg-[var(--green-dim)] text-[var(--green)]" : "bg-[var(--red-dim)] text-[var(--red)]"
        }`}>
          {isUp ? "BULLISH" : "BEARISH"}
        </span>
      </div>

      <div className="text-center py-1">
        <p className={`num text-4xl font-bold ${isUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
          {confPct}%
        </p>
        <p className="text-[11px] text-[var(--text-3)] mt-1">confidence</p>
      </div>

      <div className="h-1.5 rounded-full" style={{ background: "var(--bg-hover)" }}>
        <div className="h-full rounded-full"
          style={{ width: `${confPct}%`, background: isUp ? "var(--green)" : "var(--red)" }} />
      </div>

      <div className="space-y-3 pt-1">
        <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wide font-medium">
          Signals <span className="normal-case">· tap <IconInfo size={10} className="inline" /> to explain</span>
        </p>
        {result.signals.map((s) => <SignalBar key={s.name} signal={s} />)}
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
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
          style={agree ? {
            background: "var(--green-dim)",
            color: "var(--green)",
          } : {
            background: "var(--bg-raised)",
            color: "var(--text-2)",
          }}
        >
          {agree
            ? <><IconLightning size={10} /> Aligned {isUp ? "Bullish" : "Bearish"} · {Math.round(combinedConf * 100)}% avg</>
            : <><IconWarning size={10} /> Mixed Signals</>}
        </span>
      </div>

      <div
        className="mb-5 mt-3 rounded-xl p-3 text-[11px] text-[var(--text-2)] leading-relaxed"
        style={{ background: "var(--bg-raised)" }}
      >
        {agree
          ? `Both the Technical model (v1.0) and Momentum model (v2.0) predict the stock moves ${isUp ? "up" : "down"}. When two independent methods agree, the signal is generally considered stronger.`
          : "The two models point in opposite directions. Many traders wait for alignment before acting."}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ModelPanel result={v1} label="Model v1.0 — Technical" description="Moving averages, RSI, MACD, price momentum" />
        <ModelPanel result={v2} label="Model v2.0 — Momentum" description="Rate of change, Bollinger bands, volume, trend" />
      </div>

      {!agree && (
        <div
          className="mt-3 p-3 rounded-xl text-xs text-[var(--text-2)]"
          style={{ background: "var(--bg-raised)", borderLeft: "2px solid rgba(201,168,76,0.3)" }}
        >
          <strong className="text-white">Consider waiting</strong> — v1.0 predicts{" "}
          <span className={v1.prediction === "up" ? "text-[var(--green)]" : "text-[var(--red)]"}>{v1.prediction}</span>{" "}
          while v2.0 predicts{" "}
          <span className={v2.prediction === "up" ? "text-[var(--green)]" : "text-[var(--red)]"}>{v2.prediction}</span>.
          Alignment historically improves prediction reliability.
        </div>
      )}
    </div>
  );
}
