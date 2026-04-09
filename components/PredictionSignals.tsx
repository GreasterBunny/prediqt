"use client";

import { useState } from "react";
import type { Signal } from "@/types";
import { getSignalInfo } from "@/lib/signal-descriptions";
import { IconInfo } from "./Icons";

interface PredictionSignalsProps {
  signals: Signal[];
}

const cfg = {
  up:      { label: "Bullish", color: "var(--green)", textColor: "text-[var(--green)]", bg: "bg-[var(--green-dim)]" },
  down:    { label: "Bearish", color: "var(--red)",   textColor: "text-[var(--red)]",   bg: "bg-[var(--red-dim)]"  },
  neutral: { label: "Neutral", color: "#52525b",      textColor: "text-[var(--text-2)]", bg: "bg-[var(--bg-raised)]" },
};

function SignalRow({ signal }: { signal: Signal }) {
  const [expanded, setExpanded] = useState(false);
  const c = cfg[signal.direction];
  const pct = Math.round(signal.confidence * 100);
  const info = getSignalInfo(signal.name);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-raised)" }}>
      {/* Main row */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{signal.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.bg} ${c.textColor}`}>
              {c.label}
            </span>
            {info && (
              <span className="text-[10px] text-[var(--text-3)]">{info.tagline}</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`num text-sm font-bold ${c.textColor}`}>{pct}%</span>
            {info && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="flex items-center gap-1 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                aria-label={expanded ? "Hide explanation" : "Show explanation"}
              >
                <IconInfo size={12} />
                <span className="text-[10px]">{expanded ? "less" : "explain"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Confidence bar */}
        <div className="h-1.5 w-full rounded-full mb-2.5" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: c.color }}
          />
        </div>

        {/* Technical reason */}
        <p className="text-[11px] text-[var(--text-3)] leading-relaxed">{signal.reason}</p>
      </div>

      {/* Expandable explanation */}
      {expanded && info && (
        <div
          className="px-4 pb-4 pt-0 border-t"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          {/* Tagline with weight */}
          <div className="flex items-center justify-between mb-3 pt-3">
            <p className="text-[11px] font-semibold text-white">{info.name}</p>
            <span className="text-[10px] text-[var(--text-3)] bg-[var(--bg-hover)] px-2 py-0.5 rounded-full">
              {info.weight}
            </span>
          </div>

          <div className="space-y-3">
            {/* What */}
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wide mb-1">
                What it measures
              </p>
              <p className="text-xs text-[var(--text-2)] leading-relaxed">{info.what}</p>
            </div>

            {/* How to read it */}
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wide mb-1">
                How to read it
              </p>
              <p className="text-xs text-[var(--text-2)] leading-relaxed">{info.how}</p>
            </div>

            {/* Analogy */}
            <div
              className="rounded-lg p-3"
              style={{ background: "rgba(255,255,255,0.03)", borderLeft: "2px solid rgba(255,255,255,0.08)" }}
            >
              <p className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wide mb-1">
                Think of it like…
              </p>
              <p className="text-xs text-[var(--text-2)] leading-relaxed italic">{info.analogy}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PredictionSignals({ signals }: PredictionSignalsProps) {
  const [allExpanded, setAllExpanded] = useState(false);

  // v1 weight footer
  const weightLine = signals.map((s) => {
    const info = getSignalInfo(s.name);
    return info ? `${s.name} ${info.weight.split(" ")[0]}` : s.name;
  }).join(" · ");

  return (
    <div className="card p-5" style={{ background: "var(--bg-card)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide uppercase">
            Signal Breakdown
          </p>
          <p className="text-[10px] text-[var(--text-3)] mt-0.5">
            Click <span className="text-[var(--text-2)]">explain</span> on any signal to learn what it means
          </p>
        </div>
        <button
          onClick={() => setAllExpanded((e) => !e)}
          className="text-[11px] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors flex items-center gap-1"
        >
          <IconInfo size={13} />
          {allExpanded ? "collapse all" : "explain all"}
        </button>
      </div>

      <div className="space-y-2">
        {signals.map((signal) => (
          <ExpandableSignalRow key={signal.name} signal={signal} forceExpanded={allExpanded} />
        ))}
      </div>

      <p className="mt-4 pt-3 border-t border-[var(--border)] text-[10px] text-[var(--text-3)]">
        Model weights: {weightLine}
      </p>
    </div>
  );
}

// Separate component so forceExpanded can control it via useEffect
function ExpandableSignalRow({ signal, forceExpanded }: { signal: Signal; forceExpanded: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const c = cfg[signal.direction];
  const pct = Math.round(signal.confidence * 100);
  const info = getSignalInfo(signal.name);

  // Sync with forceExpanded
  const isOpen = expanded || forceExpanded;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-raised)" }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-white">{signal.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.bg} ${c.textColor}`}>
                {c.label}
              </span>
            </div>
            {info && (
              <p className="text-[11px] text-[var(--text-3)]">{info.tagline}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`num text-sm font-bold tabular-nums ${c.textColor}`}>{pct}%</span>
            {info && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className={`flex items-center gap-1 transition-colors rounded-full px-1.5 py-0.5 text-[10px] ${
                  isOpen
                    ? "text-white bg-[var(--bg-hover)]"
                    : "text-[var(--text-3)] hover:text-[var(--text-2)]"
                }`}
                aria-label={isOpen ? "Collapse" : "Explain"}
              >
                <IconInfo size={12} />
                <span>{isOpen && !forceExpanded ? "less" : "explain"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Confidence bar */}
        <div className="h-1.5 w-full rounded-full mb-2.5" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: c.color }}
          />
        </div>

        {/* Technical reading */}
        <p className="text-[11px] text-[var(--text-3)] leading-relaxed">{signal.reason}</p>
      </div>

      {/* Expandable explanation panel */}
      {isOpen && info && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-3 pt-3">
            <p className="text-xs font-semibold text-white">{info.name}</p>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-2)" }}
            >
              {info.weight}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wide mb-1">
                What it measures
              </p>
              <p className="text-xs text-[var(--text-2)] leading-relaxed">{info.what}</p>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wide mb-1">
                How to read it
              </p>
              <p className="text-xs text-[var(--text-2)] leading-relaxed">{info.how}</p>
            </div>

            <div
              className="rounded-lg p-3"
              style={{ background: "rgba(255,255,255,0.025)", borderLeft: "2px solid rgba(255,255,255,0.07)" }}
            >
              <p className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wide mb-1">
                Think of it like…
              </p>
              <p className="text-xs text-[var(--text-2)] leading-relaxed italic">{info.analogy}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
