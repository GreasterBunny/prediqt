"use client";

import { useEffect, useState } from "react";
import type { SentimentResult } from "@/services/sentiment";

interface SentimentCardProps {
  ticker: string;
}

export default function SentimentCard({ ticker }: SentimentCardProps) {
  const [data, setData] = useState<SentimentResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/fetch-sentiment?ticker=${ticker}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [ticker]);

  const scoreToBar = (score: number) => Math.round((score + 1) * 50); // 0–100

  if (loading) {
    return (
      <div className="card p-5" style={{ background: "var(--bg-card)" }}>
        <div className="flex items-center gap-2 mb-4">
          <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide uppercase">News Sentiment</p>
          <span className="text-[10px] text-[var(--text-3)] bg-[var(--bg-raised)] px-1.5 py-0.5 rounded">AI</span>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[var(--bg-raised)] rounded w-1/3" />
          <div className="h-2 bg-[var(--bg-raised)] rounded w-full" />
          <div className="h-3 bg-[var(--bg-raised)] rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card p-5" style={{ background: "var(--bg-card)" }}>
        <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide uppercase mb-3">News Sentiment</p>
        <p className="text-xs text-[var(--text-3)]">Unable to load sentiment data.</p>
      </div>
    );
  }

  const isPositive = data.sentimentLabel === "bullish";
  const isNegative = data.sentimentLabel === "bearish";
  const barPct = scoreToBar(data.sentimentScore);

  return (
    <div className="card p-5" style={{ background: "var(--bg-card)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide uppercase">News Sentiment</p>
          <span className="text-[10px] text-[var(--text-3)] bg-[var(--bg-raised)] px-1.5 py-0.5 rounded border border-[var(--border)]">
            {data.source === "ai" ? "Claude AI" : data.source === "cache" ? "Cached" : "Keyword"}
          </span>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            isPositive
              ? "bg-[var(--green-dim)] text-[var(--green)]"
              : isNegative
              ? "bg-[var(--red-dim)] text-[var(--red)]"
              : "bg-[var(--bg-raised)] text-[var(--text-2)]"
          }`}
        >
          {data.sentimentLabel.charAt(0).toUpperCase() + data.sentimentLabel.slice(1)}
        </span>
      </div>

      {/* Score */}
      <div className="flex items-end gap-3 mb-4">
        <span
          className={`num text-3xl font-bold ${
            isPositive ? "text-[var(--green)]" : isNegative ? "text-[var(--red)]" : "text-[var(--text-2)]"
          }`}
        >
          {data.sentimentScore > 0 ? "+" : ""}{data.sentimentScore.toFixed(2)}
        </span>
        <span className="text-xs text-[var(--text-3)] mb-1">out of ±1.00</span>
      </div>

      {/* Gradient bar */}
      <div className="relative h-2 rounded-full mb-1" style={{ background: "var(--bg-raised)" }}>
        {/* gradient track */}
        <div className="absolute inset-0 rounded-full opacity-25"
          style={{ background: "linear-gradient(to right, var(--red), var(--bg-raised), var(--green))" }} />
        {/* indicator dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-card)] shadow-lg"
          style={{
            left: `calc(${barPct}% - 6px)`,
            background: isPositive ? "var(--green)" : isNegative ? "var(--red)" : "var(--text-2)",
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--text-3)] mb-4">
        <span>Bearish</span>
        <span>Neutral</span>
        <span>Bullish</span>
      </div>

      {/* Summary */}
      <p className="text-xs text-[var(--text-2)] leading-relaxed border-t border-[var(--border)] pt-4">
        {data.summary}
      </p>

      {/* Meta */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
        <span className="text-[10px] text-[var(--text-3)]">
          {data.headlineCount} headline{data.headlineCount !== 1 ? "s" : ""} analyzed
        </span>
        <span className="text-[10px] text-[var(--text-3)]">
          {new Date(data.analyzedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}
