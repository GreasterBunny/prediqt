"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { IconPlay, IconRotateCcw } from "@/components/Icons";

interface Position {
  id: string;
  stocks: { ticker: string; name: string };
  entry_price: number;
  shares: number;
  cost_basis: number;
  entry_confidence: number;
  opened_at: string;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPct: number;
}

interface ClosedTrade {
  id: string;
  stocks: { ticker: string; name: string };
  entry_price: number;
  exit_price: number;
  shares: number;
  cost_basis: number;
  proceeds: number;
  pnl: number;
  pnl_pct: number;
  opened_at: string;
  closed_at: string;
  close_reason: string;
  entry_confidence: number;
}

interface Snapshot {
  snapshot_date: string;
  portfolio_value: number;
  cash_balance: number;
  realized_pnl: number;
  unrealized_pnl: number;
}

interface Summary {
  wallet: { id: string; started_at: string; initial_balance: number; cash_balance: number; experiment_days: number };
  day: number;
  daysLeft: number;
  portfolioValue: number;
  cashBalance: number;
  totalReturn: number;
  totalReturnPct: number;
  realizedPnl: number;
  unrealizedPnl: number;
  openPositions: Position[];
  closedTrades: ClosedTrade[];
  winRate: number;
  avgPnl: number;
  bestTrade: ClosedTrade | null;
  worstTrade: ClosedTrade | null;
  snapshots: Snapshot[];
}

function fmt(n: number, decimals = 2) {
  return n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(2)}%`;
}
function fmtUsd(n: number) {
  return `${n >= 0 ? "+" : "-"}$${fmt(Math.abs(n))}`;
}

// ── P&L Sparkline ───────────────────────────────────────────────
function PnlChart({ snapshots, initial }: { snapshots: Snapshot[]; initial: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || snapshots.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    const padL = 60, padR = 12, padT = 12, padB = 28;

    const values = [initial, ...snapshots.map((s) => s.portfolio_value)];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 100;

    const toX = (i: number) => padL + (i / (values.length - 1)) * (W - padL - padR);
    const toY = (v: number) => padT + (1 - (v - min) / range) * (H - padT - padB);

    const isPos = values[values.length - 1] >= initial;
    const color = isPos ? "#22c55e" : "#ef4444";

    // Grid + Y labels
    [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
      const v = min + t * range;
      const y = toY(v);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.font = "10px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(`$${fmt(v, 0)}`, padL - 6, y + 3.5);
    });

    // Baseline (initial)
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(padL, toY(initial)); ctx.lineTo(W - padR, toY(initial)); ctx.stroke();
    ctx.setLineDash([]);

    // Area
    const grad = ctx.createLinearGradient(0, padT, 0, H - padB);
    grad.addColorStop(0, isPos ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)");
    grad.addColorStop(1, "rgba(0,0,0,0)");

    ctx.beginPath();
    values.forEach((v, i) => { i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)); });
    ctx.lineTo(toX(values.length - 1), H - padB);
    ctx.lineTo(toX(0), H - padB);
    ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath();
    values.forEach((v, i) => { i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)); });
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();

    // X labels
    ctx.fillStyle = "rgba(255,255,255,0.28)"; ctx.textAlign = "center";
    const labels = ["Start", ...snapshots.map((s) =>
      new Date(s.snapshot_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    )];
    [0, Math.floor(labels.length / 2), labels.length - 1].forEach((i) => {
      if (labels[i]) ctx.fillText(labels[i], toX(i), H - 6);
    });
  }, [snapshots, initial]);

  return <canvas ref={ref} style={{ width: "100%", height: "180px", display: "block" }} />;
}

// ── Main Component ───────────────────────────────────────────────
export default function PaperTradingClient() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const fetchSummary = useCallback(async () => {
    const res = await fetch("/api/paper-trading/summary");
    if (res.ok) setSummary(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const runBot = async () => {
    setExecuting(true);
    const res = await fetch("/api/paper-trading/execute", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      const entries = data.actions.map(
        (a: { action: string; ticker: string; reason: string; pnl?: number; shares?: number; price: number }) =>
          `[${a.action.toUpperCase()}] ${a.ticker} @ $${a.price.toFixed(2)} — ${a.reason}${a.pnl !== undefined ? ` | P&L: ${fmtUsd(a.pnl)}` : ""}`
      );
      setLog((prev) => [`── Day ${data.day} run at ${new Date().toLocaleTimeString()} ──`, ...entries, ...prev]);
      setLastRun(new Date().toLocaleTimeString());
      await fetchSummary();
    }
    setExecuting(false);
  };

  const resetBot = async () => {
    if (!confirm("Reset the experiment? All trades and history will be archived.")) return;
    setResetting(true);
    await fetch("/api/paper-trading/reset", { method: "POST" });
    setLog([]);
    setLastRun(null);
    await fetchSummary();
    setResetting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="h-8 w-8 rounded-full border-2 border-[var(--green)] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-2)]">Loading portfolio…</p>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const {
    day, daysLeft, portfolioValue, cashBalance, totalReturn, totalReturnPct,
    realizedPnl, unrealizedPnl, openPositions, closedTrades,
    winRate, avgPnl, bestTrade, worstTrade, snapshots, wallet,
  } = summary;

  const isPos = totalReturn >= 0;
  const progressPct = Math.min(((day - 1) / wallet.experiment_days) * 100, 100);

  return (
    <div className="space-y-4">
      {/* Page title + controls */}
      <div className="flex flex-wrap items-start justify-between gap-4 py-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">Paper Trading</h1>
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-[var(--bg-raised)] text-[var(--text-2)]">
              10-Day Experiment
            </span>
          </div>
          <p className="text-sm text-[var(--text-2)]">
            AI bot trading with ${fmt(wallet.initial_balance, 0)} paper money · Long-only · Min {Math.round(0.62 * 100)}% confidence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetBot}
            disabled={resetting}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-2)] hover:text-white transition-colors"
            style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}
          >
            {resetting ? "Resetting…" : <><IconRotateCcw size={12} className="inline mr-1.5" />Reset</>}
          </button>
          <button
            onClick={runBot}
            disabled={executing || daysLeft === 0}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-black transition-all disabled:opacity-40"
            style={{ background: executing ? "var(--text-3)" : "var(--green)" }}
          >
            {executing ? "Running…" : daysLeft === 0 ? "Experiment Complete" : <><IconPlay size={12} className="inline mr-1.5" />Run Bot</>}
          </button>
        </div>
      </div>

      {/* 10-day progress bar */}
      <div className="card p-4" style={{ background: "var(--bg-card)" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide">
            Experiment Progress
          </p>
          <p className="num text-[11px] text-[var(--text-2)]">
            Day {Math.min(day, wallet.experiment_days)} of {wallet.experiment_days}
            {daysLeft > 0 ? ` · ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left` : " · Complete"}
          </p>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[var(--bg-raised)]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progressPct}%`, background: "var(--green)" }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          {Array.from({ length: wallet.experiment_days }, (_, i) => (
            <span
              key={i}
              className={`text-[9px] ${i < day - 1 ? "text-[var(--green)]" : "text-[var(--text-3)]"}`}
            >
              {i + 1}
            </span>
          ))}
        </div>
      </div>

      {/* Wallet summary */}
      <div className="card p-5" style={{ background: "var(--bg-card)" }}>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div>
            <p className="text-[11px] text-[var(--text-3)] mb-1">Portfolio Value</p>
            <p className="num text-4xl font-bold text-white">${fmt(portfolioValue)}</p>
            <p className={`num text-sm font-medium mt-1 ${isPos ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
              {fmtUsd(totalReturn)} ({fmtPct(totalReturnPct)}) total return
            </p>
          </div>
          {lastRun && (
            <p className="text-[11px] text-[var(--text-3)]">Last run: {lastRun}</p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
          {[
            { label: "Cash", value: `$${fmt(cashBalance)}`, sub: "available" },
            { label: "Realized P&L", value: fmtUsd(realizedPnl), sub: "closed trades", color: realizedPnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]" },
            { label: "Unrealized P&L", value: fmtUsd(unrealizedPnl), sub: "open positions", color: unrealizedPnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]" },
            { label: "Win Rate", value: closedTrades.length > 0 ? `${Math.round(winRate * 100)}%` : "—", sub: closedTrades.length > 0 ? `${closedTrades.filter(t => t.pnl > 0).length}/${closedTrades.length} trades` : "no closed trades" },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: "var(--bg-raised)" }}>
              <p className="text-[11px] text-[var(--text-3)]">{label}</p>
              <p className={`num text-lg font-bold mt-1 leading-none ${color ?? "text-white"}`}>{value}</p>
              <p className="text-[10px] text-[var(--text-3)] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* P&L chart */}
        {snapshots.length > 0 ? (
          <PnlChart snapshots={snapshots} initial={wallet.initial_balance} />
        ) : (
          <div className="flex items-center justify-center h-32 rounded-xl" style={{ background: "var(--bg-raised)" }}>
            <p className="text-sm text-[var(--text-3)]">Run the bot to start tracking performance</p>
          </div>
        )}
      </div>

      {/* Best / worst trade */}
      {(bestTrade || worstTrade) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {bestTrade && (
            <div className="card p-4" style={{ background: "var(--bg-card)" }}>
              <p className="text-[11px] text-[var(--text-3)] mb-2">Best Trade</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">{bestTrade.stocks.ticker}</p>
                  <p className="text-xs text-[var(--text-2)] mt-0.5">
                    ${bestTrade.entry_price.toFixed(2)} → ${bestTrade.exit_price?.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="num text-lg font-bold text-[var(--green)]">{fmtUsd(bestTrade.pnl)}</p>
                  <p className="num text-xs text-[var(--green)]">{fmtPct(bestTrade.pnl_pct)}</p>
                </div>
              </div>
            </div>
          )}
          {worstTrade && (
            <div className="card p-4" style={{ background: "var(--bg-card)" }}>
              <p className="text-[11px] text-[var(--text-3)] mb-2">Worst Trade</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">{worstTrade.stocks.ticker}</p>
                  <p className="text-xs text-[var(--text-2)] mt-0.5">
                    ${worstTrade.entry_price.toFixed(2)} → ${worstTrade.exit_price?.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="num text-lg font-bold text-[var(--red)]">{fmtUsd(worstTrade.pnl)}</p>
                  <p className="num text-xs text-[var(--red)]">{fmtPct(worstTrade.pnl_pct)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Open positions */}
      <div className="card p-5" style={{ background: "var(--bg-card)" }}>
        <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide mb-4">
          Open Positions ({openPositions.length})
        </p>
        {openPositions.length === 0 ? (
          <p className="text-sm text-[var(--text-3)] py-4 text-center">No open positions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Stock", "Entry", "Current", "Shares", "Cost Basis", "Mkt Value", "Unreal. P&L"].map((h, i) => (
                    <th key={h} className={`pb-2.5 text-[11px] font-medium text-[var(--text-3)] ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {openPositions.map((pos) => {
                  const isGain = pos.unrealizedPnl >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-[var(--bg-raised)] transition-colors">
                      <td className="py-3">
                        <p className="font-semibold text-sm text-white">{pos.stocks.ticker}</p>
                        <p className="text-[10px] text-[var(--text-3)]">{Math.round(pos.entry_confidence * 100)}% conf</p>
                      </td>
                      <td className="num py-3 text-right text-sm text-[var(--text-2)]">${pos.entry_price.toFixed(2)}</td>
                      <td className="num py-3 text-right text-sm text-white">${pos.currentPrice.toFixed(2)}</td>
                      <td className="num py-3 text-right text-sm text-[var(--text-2)]">{pos.shares.toFixed(4)}</td>
                      <td className="num py-3 text-right text-sm text-[var(--text-2)]">${fmt(pos.cost_basis)}</td>
                      <td className="num py-3 text-right text-sm text-white">${fmt(pos.marketValue)}</td>
                      <td className="num py-3 text-right">
                        <p className={`text-sm font-semibold ${isGain ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                          {fmtUsd(pos.unrealizedPnl)}
                        </p>
                        <p className={`text-[10px] ${isGain ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                          {fmtPct(pos.unrealizedPct)}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Closed trades */}
      <div className="card p-5" style={{ background: "var(--bg-card)" }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide">
            Trade Log ({closedTrades.length} closed)
          </p>
          {closedTrades.length > 0 && (
            <span className="num text-[11px] text-[var(--text-2)]">
              Avg: {fmtUsd(avgPnl)} per trade
            </span>
          )}
        </div>
        {closedTrades.length === 0 ? (
          <p className="text-sm text-[var(--text-3)] py-4 text-center">No closed trades yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Stock", "Entry", "Exit", "Shares", "P&L", "Return", "Reason", "Held"].map((h, i) => (
                    <th key={h} className={`pb-2.5 text-[11px] font-medium text-[var(--text-3)] ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {closedTrades.map((trade) => {
                  const isWin = trade.pnl >= 0;
                  const heldMs = new Date(trade.closed_at).getTime() - new Date(trade.opened_at).getTime();
                  const heldHrs = Math.round(heldMs / 3600000);
                  const heldLabel = heldHrs >= 24 ? `${Math.round(heldHrs / 24)}d` : `${heldHrs}h`;
                  return (
                    <tr key={trade.id} className="hover:bg-[var(--bg-raised)] transition-colors">
                      <td className="py-3">
                        <p className="font-semibold text-sm text-white">{trade.stocks.ticker}</p>
                        <p className="text-[10px] text-[var(--text-3)]">{Math.round(trade.entry_confidence * 100)}% conf</p>
                      </td>
                      <td className="num py-3 text-right text-sm text-[var(--text-2)]">${trade.entry_price.toFixed(2)}</td>
                      <td className="num py-3 text-right text-sm text-[var(--text-2)]">${trade.exit_price?.toFixed(2)}</td>
                      <td className="num py-3 text-right text-sm text-[var(--text-2)]">{trade.shares.toFixed(4)}</td>
                      <td className={`num py-3 text-right text-sm font-semibold ${isWin ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {fmtUsd(trade.pnl)}
                      </td>
                      <td className={`num py-3 text-right text-sm ${isWin ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {fmtPct(trade.pnl_pct)}
                      </td>
                      <td className="py-3 text-right text-[10px] text-[var(--text-3)]">
                        {trade.close_reason?.replace("_", " ")}
                      </td>
                      <td className="num py-3 text-right text-xs text-[var(--text-3)]">{heldLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bot activity log */}
      {log.length > 0 && (
        <div className="card p-5" style={{ background: "var(--bg-card)" }}>
          <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide mb-3">Bot Activity Log</p>
          <div className="space-y-1 font-mono text-[11px] max-h-48 overflow-y-auto">
            {log.map((line, i) => (
              <p
                key={i}
                className={
                  line.startsWith("──")
                    ? "text-[var(--text-3)] mt-2"
                    : line.includes("[BUY]")
                    ? "text-[var(--green)]"
                    : line.includes("[SELL]")
                    ? "text-[var(--red)]"
                    : line.includes("[HOLD]")
                    ? "text-white"
                    : "text-[var(--text-3)]"
                }
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      <p className="pt-2 text-center text-xs text-[var(--text-3)]">
        Paper trading only · No real money involved · Results do not constitute financial advice
      </p>
    </div>
  );
}
