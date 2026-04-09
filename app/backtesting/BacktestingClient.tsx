"use client";

import { useState } from "react";
import type { BacktestResult } from "@/services/backtesting";
import EquityChart from "@/components/EquityChart";
import { IconLineChart, IconArrowUp, IconArrowDown, IconTriangleUp, IconTriangleDown } from "@/components/Icons";

const TICKERS = ["AAPL", "MSFT", "NVDA", "GOOG", "AMZN", "META"];

function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "green" | "red" | "neutral";
}) {
  const textColor =
    color === "green"
      ? "text-[var(--green)]"
      : color === "red"
      ? "text-[var(--red)]"
      : "text-white";
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--bg-raised)" }}>
      <p className="text-[11px] text-[var(--text-3)] mb-1">{label}</p>
      <p className={`num text-xl font-bold ${textColor}`}>{value}</p>
      {sub && <p className="text-[11px] text-[var(--text-3)] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function BacktestingClient() {
  const [ticker, setTicker] = useState("AAPL");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runBacktest() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/backtest?ticker=${ticker}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to run backtest");
      setResult(data as BacktestResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;
  const fmtUsd = (v: number) => `$${v.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card p-5" style={{ background: "var(--bg-card)" }}>
        <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide uppercase mb-4">
          Configure Backtest
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-[var(--text-2)] block mb-2">Stock</label>
            <div className="flex flex-wrap gap-2">
              {TICKERS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTicker(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    ticker === t
                      ? "bg-white text-black"
                      : "bg-[var(--bg-raised)] text-[var(--text-2)] hover:text-white hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={runBacktest}
            disabled={loading}
            className="ml-auto px-5 py-2 rounded-full text-sm font-semibold bg-white text-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Running…" : "Run Backtest"}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-xs text-[var(--red)]">{error}</p>
        )}
      </div>

      {/* Empty state */}
      {!result && !loading && (
        <div className="text-center py-20">
          <div className="flex justify-center mb-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "var(--bg-raised)" }}>
            <IconLineChart size={24} className="text-[var(--text-3)]" />
          </span>
        </div>
          <p className="text-[var(--text-2)] text-sm">Select a stock and run the backtest to see results.</p>
          <p className="text-[var(--text-3)] text-xs mt-1">
            Simulates the prediction model on historical price data with walk-forward validation.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card p-8 text-center" style={{ background: "var(--bg-card)" }}>
          <div className="flex items-center justify-center gap-2 text-[var(--text-2)]">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm">Simulating trades…</span>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary header */}
          <div className="card p-5" style={{ background: "var(--bg-card)" }}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
              <div>
                <p className="text-xs text-[var(--text-3)]">
                  {result.startDate} — {result.endDate}
                </p>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  {result.ticker} Backtest Results
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-[var(--text-3)]">Strategy vs Buy-and-Hold</p>
                <p className={`num text-2xl font-bold ${result.totalReturnPct >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                  {fmtPct(result.totalReturnPct)}
                  <span className="text-sm text-[var(--text-3)] ml-2">vs {fmtPct(result.benchmarkReturnPct)}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Equity chart */}
          <div className="card p-5" style={{ background: "var(--bg-card)" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide uppercase">
                Equity Curve
              </p>
              <div className="flex items-center gap-4 text-[10px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[var(--green)] inline-block" />
                  <span className="text-[var(--text-2)]">Strategy</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[var(--text-3)] inline-block" />
                  <span className="text-[var(--text-2)]">Buy & Hold</span>
                </span>
              </div>
            </div>
            <EquityChart data={result.equityCurve} initialCapital={result.initialCapital} />
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Final Value"
              value={fmtUsd(result.finalValue)}
              sub={`Started at $${result.initialCapital.toLocaleString()}`}
              color={result.finalValue >= result.initialCapital ? "green" : "red"}
            />
            <MetricCard
              label="Win Rate"
              value={`${(result.winRate * 100).toFixed(1)}%`}
              sub={`${result.winningTrades}W / ${result.losingTrades}L of ${result.totalTrades}`}
              color={result.winRate >= 0.5 ? "green" : "red"}
            />
            <MetricCard
              label="Sharpe Ratio"
              value={result.sharpeRatio.toFixed(2)}
              sub="Annualised, risk-free = 0"
              color={result.sharpeRatio >= 1 ? "green" : result.sharpeRatio >= 0 ? "neutral" : "red"}
            />
            <MetricCard
              label="Max Drawdown"
              value={fmtPct(result.maxDrawdownPct)}
              sub={`$${result.maxDrawdown.toFixed(0)} peak-to-trough`}
              color={result.maxDrawdownPct <= 0.1 ? "green" : "red"}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Avg Win"
              value={`+${result.avgWinPct.toFixed(2)}%`}
              color="green"
            />
            <MetricCard
              label="Avg Loss"
              value={`${result.avgLossPct.toFixed(2)}%`}
              color="red"
            />
            <MetricCard
              label="vs Benchmark"
              value={fmtPct(result.totalReturnPct - result.benchmarkReturnPct)}
              sub="Alpha generated"
              color={result.totalReturnPct >= result.benchmarkReturnPct ? "green" : "red"}
            />
            <MetricCard
              label="Total Trades"
              value={result.totalTrades.toString()}
              sub={`${result.startDate} – ${result.endDate}`}
            />
          </div>

          {/* Trade log */}
          <div className="card p-5" style={{ background: "var(--bg-card)" }}>
            <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide uppercase mb-4">
              Trade Log
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {["Date", "Signal", "Actual", "Entry", "Exit", "P&L %", "Portfolio"].map((h) => (
                      <th key={h} className="text-left pb-2 text-[var(--text-3)] font-medium pr-4 last:pr-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.trades.slice(-20).reverse().map((trade, i) => (
                    <tr key={i} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2 pr-4 text-[var(--text-2)]">{trade.date}</td>
                      <td className="py-2 pr-4">
                        <span className={`inline-flex items-center gap-1.5 font-medium ${trade.direction === "up" ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                          {trade.direction === "up" ? <IconArrowUp size={11} /> : <IconArrowDown size={11} />}
                          {trade.direction === "up" ? "Long" : "Short"}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={trade.actual === "up" ? "text-[var(--green)]" : "text-[var(--red)]"}>
                          {trade.actual === "up" ? <IconTriangleUp size={9} /> : <IconTriangleDown size={9} />}
                        </span>
                      </td>
                      <td className="num py-2 pr-4 text-[var(--text-2)]">${trade.entryPrice.toFixed(2)}</td>
                      <td className="num py-2 pr-4 text-[var(--text-2)]">${trade.exitPrice.toFixed(2)}</td>
                      <td className={`num py-2 pr-4 font-medium ${trade.correct ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {trade.correct ? "+" : ""}{trade.pnlPct.toFixed(2)}%
                      </td>
                      <td className="num py-2 text-white font-medium">${trade.portfolioValue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.trades.length > 20 && (
                <p className="text-[11px] text-[var(--text-3)] mt-3 text-center">
                  Showing last 20 of {result.trades.length} trades
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
