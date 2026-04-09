"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  IconPlay,
  IconRotateCcw,
  IconClock,
  IconDot,
  IconActivity,
  IconBot,
  IconX,
} from "@/components/Icons";

// ── Types ────────────────────────────────────────────────────────────────────

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
  wallet: {
    id: string;
    started_at: string;
    initial_balance: number;
    cash_balance: number;
    experiment_days: number;
  };
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

interface BotState {
  is_running: boolean;
  mode: "manual" | "continuous" | "timed" | "scheduled";
  run_until: string | null;
  schedule_start: string | null;
  schedule_end: string | null;
  last_cycle_at: string | null;
  total_cycles: number;
  cash_balance: number;
  initial_balance: number;
}

interface LogEntry {
  ts: string;
  text: string;
  type: "buy" | "sell" | "hold" | "skip" | "info" | "error";
}

type BotMode = "continuous" | "timed" | "scheduled";
type TimedDuration = "1h" | "6h" | "12h" | "24h" | "3d" | "1w";
type SchedulePreset = "market" | "afterhours" | "overnight" | "custom";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2) {
  return n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(2)}%`;
}
function fmtUsd(n: number) {
  return `${n >= 0 ? "+" : "-"}$${fmt(Math.abs(n))}`;
}

function timeAgo(isoString: string | null): string {
  if (!isoString) return "never";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function nextCycleIn(lastCycleAt: string | null): string {
  if (!lastCycleAt) return "~now";
  const nextMs = new Date(lastCycleAt).getTime() + 5 * 60 * 1000;
  const diffMs = nextMs - Date.now();
  if (diffMs <= 0) return "~now";
  const mins = Math.ceil(diffMs / 60000);
  return `~${mins}m`;
}

function durationToMs(d: TimedDuration): number {
  const map: Record<TimedDuration, number> = {
    "1h": 3600_000,
    "6h": 6 * 3600_000,
    "12h": 12 * 3600_000,
    "24h": 24 * 3600_000,
    "3d": 3 * 24 * 3600_000,
    "1w": 7 * 24 * 3600_000,
  };
  return map[d];
}

const SCHEDULE_PRESETS: Record<SchedulePreset, { start: string; end: string; label: string }> = {
  market: { start: "14:30", end: "21:00", label: "Market Hours" },
  afterhours: { start: "21:00", end: "01:00", label: "After Hours" },
  overnight: { start: "01:00", end: "14:30", label: "Overnight" },
  custom: { start: "", end: "", label: "Custom" },
};

// ── P&L Sparkline ────────────────────────────────────────────────────────────

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

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(padL, toY(initial)); ctx.lineTo(W - padR, toY(initial)); ctx.stroke();
    ctx.setLineDash([]);

    const grad = ctx.createLinearGradient(0, padT, 0, H - padB);
    grad.addColorStop(0, isPos ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)");
    grad.addColorStop(1, "rgba(0,0,0,0)");

    ctx.beginPath();
    values.forEach((v, i) => { i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)); });
    ctx.lineTo(toX(values.length - 1), H - padB);
    ctx.lineTo(toX(0), H - padB);
    ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    ctx.beginPath();
    values.forEach((v, i) => { i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)); });
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();

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

// ── Pill Button ──────────────────────────────────────────────────────────────

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-medium transition-all"
      style={{
        background: active ? "var(--green)" : "var(--bg-raised)",
        color: active ? "#000" : "var(--text-2)",
        border: active ? "1px solid var(--green)" : "1px solid var(--border)",
      }}
    >
      {children}
    </button>
  );
}

// ── Status Indicator ─────────────────────────────────────────────────────────

function BotStatusBadge({
  bot,
  scheduledActive,
}: {
  bot: BotState;
  scheduledActive: boolean;
}) {
  if (!bot.is_running) {
    return (
      <div className="flex items-center gap-2">
        <IconDot size={10} className="text-[var(--text-3)]" />
        <span className="text-sm font-semibold text-[var(--text-2)]">Stopped</span>
      </div>
    );
  }

  if (bot.mode === "scheduled" && !scheduledActive) {
    return (
      <div className="flex items-center gap-2">
        <IconClock size={14} className="text-[var(--text-2)]" />
        <span className="text-sm font-semibold text-[var(--text-2)]">
          Scheduled — outside window
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Animated green pulsing dot */}
      <span className="relative flex h-3 w-3">
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ background: "var(--green)" }}
        />
        <span
          className="relative inline-flex rounded-full h-3 w-3"
          style={{ background: "var(--green)" }}
        />
      </span>
      <span className="text-sm font-semibold" style={{ color: "var(--green)" }}>
        Running
      </span>
    </div>
  );
}

// ── Activity Log ─────────────────────────────────────────────────────────────

function ActivityLog({ entries }: { entries: LogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [entries]);

  if (entries.length === 0) {
    return (
      <p className="text-[11px] text-[var(--text-3)] py-2 text-center font-mono">
        No activity yet — start the bot to see logs here
      </p>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="space-y-0.5 font-mono text-[11px] max-h-44 overflow-y-auto"
    >
      {entries.map((entry, i) => (
        <p
          key={i}
          className={
            entry.type === "buy"
              ? "text-[var(--green)]"
              : entry.type === "sell"
              ? "text-[var(--red)]"
              : entry.type === "hold"
              ? "text-white"
              : entry.type === "error"
              ? "text-[var(--red)]"
              : entry.type === "info"
              ? "text-[var(--text-2)]"
              : "text-[var(--text-3)]"
          }
        >
          <span className="text-[var(--text-3)] mr-2">{entry.ts}</span>
          {entry.text}
        </p>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PaperTradingClient() {
  // Portfolio state
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  // Bot control state
  const [bot, setBot] = useState<BotState | null>(null);
  const [botLoading, setBotLoading] = useState(false);

  // Mode configuration UI state
  const [selectedMode, setSelectedMode] = useState<BotMode>("continuous");
  const [timedDuration, setTimedDuration] = useState<TimedDuration>("6h");
  const [schedulePreset, setSchedulePreset] = useState<SchedulePreset>("market");
  const [customStart, setCustomStart] = useState("14:30");
  const [customEnd, setCustomEnd] = useState("21:00");

  // UI state
  const [resetting, setResetting] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchSummary = useCallback(async () => {
    const res = await fetch("/api/paper-trading/summary");
    if (res.ok) setSummary(await res.json());
    setLoading(false);
  }, []);

  const fetchBotState = useCallback(async () => {
    const res = await fetch("/api/paper-trading/bot");
    if (res.ok) {
      const data = await res.json() as BotState;
      setBot(data);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSummary();
    fetchBotState();
  }, [fetchSummary, fetchBotState]);

  // Poll bot state every 15 seconds
  useEffect(() => {
    const id = setInterval(fetchBotState, 15_000);
    return () => clearInterval(id);
  }, [fetchBotState]);

  // Poll portfolio every 30 seconds when running
  useEffect(() => {
    if (!bot?.is_running) return;
    const id = setInterval(fetchSummary, 30_000);
    return () => clearInterval(id);
  }, [bot?.is_running, fetchSummary]);

  // Browser-driven tick: fire when page is open and bot is running
  // but last_cycle_at is null or > 5 minutes ago
  useEffect(() => {
    if (!bot?.is_running) return;

    const shouldTick =
      bot.last_cycle_at === null ||
      Date.now() - new Date(bot.last_cycle_at).getTime() > 5 * 60 * 1000;

    if (!shouldTick) return;

    const tick = async () => {
      try {
        const res = await fetch("/api/paper-trading/tick", { method: "POST" });
        if (res.ok) {
          const data = await res.json() as { ran: boolean; reason?: string; result?: { actions: Array<{ action: string; ticker: string; reason: string; pnl?: number; price: number; shares?: number }> ; day: number } };
          if (data.ran && data.result) {
            const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const entries: LogEntry[] = [
              { ts: now, text: `── Day ${data.result.day} cycle ──`, type: "info" },
              ...data.result.actions.map((a) => ({
                ts: now,
                text: `[${a.action.toUpperCase()}] ${a.ticker} @ $${a.price.toFixed(2)} — ${a.reason}${a.pnl !== undefined ? ` | P&L: ${fmtUsd(a.pnl)}` : ""}`,
                type: a.action as LogEntry["type"],
              })),
            ];
            setLog((prev) => [...entries, ...prev].slice(0, 80));
            await fetchSummary();
            await fetchBotState();
          }
        }
      } catch (err) {
        console.error("[tick]", err);
      }
    };

    tick();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot?.is_running, bot?.last_cycle_at]);

  // ── Bot control ───────────────────────────────────────────────────────────

  const isScheduledWindowActive = (): boolean => {
    if (!bot?.schedule_start || !bot?.schedule_end) return false;
    const parseHHMM = (s: string) => {
      const m = s.match(/^(\d{1,2}):(\d{2})$/);
      if (!m) return null;
      return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    };
    const startM = parseHHMM(bot.schedule_start);
    const endM = parseHHMM(bot.schedule_end);
    if (startM === null || endM === null) return false;
    const now = new Date();
    const nowM = now.getUTCHours() * 60 + now.getUTCMinutes();
    if (startM <= endM) return nowM >= startM && nowM < endM;
    return nowM >= startM || nowM < endM;
  };

  const startBot = async () => {
    setBotLoading(true);
    try {
      const body: Record<string, unknown> = { action: "start", mode: selectedMode };

      if (selectedMode === "timed") {
        body.run_until = new Date(Date.now() + durationToMs(timedDuration)).toISOString();
        body.schedule_start = null;
        body.schedule_end = null;
      } else if (selectedMode === "scheduled") {
        const preset = SCHEDULE_PRESETS[schedulePreset];
        body.schedule_start = schedulePreset === "custom" ? customStart : preset.start;
        body.schedule_end = schedulePreset === "custom" ? customEnd : preset.end;
        body.run_until = null;
      } else {
        body.run_until = null;
        body.schedule_start = null;
        body.schedule_end = null;
      }

      await fetch("/api/paper-trading/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLog((prev) => [
        { ts: now, text: `Bot started in ${selectedMode} mode`, type: "info" },
        ...prev,
      ]);
      await fetchBotState();
    } finally {
      setBotLoading(false);
    }
  };

  const stopBot = async (closePositions = false) => {
    setBotLoading(true);
    try {
      await fetch("/api/paper-trading/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop", closePositions }),
      });
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLog((prev) => [
        {
          ts: now,
          text: closePositions
            ? "Bot stopped — all positions force-closed"
            : "Bot stopped",
          type: "info",
        },
        ...prev,
      ]);
      await fetchBotState();
      await fetchSummary();
    } finally {
      setBotLoading(false);
    }
  };

  const resetBot = async () => {
    if (!confirm("Reset the experiment? All trades and history will be archived.")) return;
    setResetting(true);
    await fetch("/api/paper-trading/reset", { method: "POST" });
    setLog([]);
    await fetchSummary();
    await fetchBotState();
    setResetting(false);
  };

  // ── Render guards ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div
            className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
            style={{ borderColor: "var(--green)", borderTopColor: "transparent" }}
          />
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
  const scheduledActive = bot ? isScheduledWindowActive() : false;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 py-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">Paper Trading</h1>
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: "var(--bg-raised)", color: "var(--text-2)" }}
            >
              10-Day Experiment
            </span>
          </div>
          <p className="text-sm text-[var(--text-2)]">
            AI bot trading with ${fmt(wallet.initial_balance, 0)} paper money · Long-only · Min {Math.round(0.62 * 100)}% confidence
          </p>
        </div>
        <button
          onClick={resetBot}
          disabled={resetting}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            color: "var(--text-2)",
          }}
        >
          <IconRotateCcw size={12} />
          {resetting ? "Resetting…" : "Reset"}
        </button>
      </div>

      {/* ── Section 1: Bot Control Panel ── */}
      <div className="card p-5 space-y-4" style={{ background: "var(--bg-card)" }}>
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconBot size={16} className="text-[var(--text-2)]" />
            <p className="text-sm font-semibold text-white">Bot Control</p>
          </div>
          {bot && <BotStatusBadge bot={bot} scheduledActive={scheduledActive} />}
        </div>

        {/* Only show config UI when bot is stopped */}
        {(!bot?.is_running) && (
          <>
            {/* Mode selector */}
            <div>
              <p className="text-[11px] text-[var(--text-3)] mb-2">Run Mode</p>
              <div className="flex flex-wrap gap-2">
                {(["continuous", "timed", "scheduled"] as BotMode[]).map((m) => (
                  <Pill key={m} active={selectedMode === m} onClick={() => setSelectedMode(m)}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Pill>
                ))}
              </div>
            </div>

            {/* Timed: duration pills */}
            {selectedMode === "timed" && (
              <div>
                <p className="text-[11px] text-[var(--text-3)] mb-2">Duration</p>
                <div className="flex flex-wrap gap-2">
                  {(["1h", "6h", "12h", "24h", "3d", "1w"] as TimedDuration[]).map((d) => (
                    <Pill key={d} active={timedDuration === d} onClick={() => setTimedDuration(d)}>
                      {d}
                    </Pill>
                  ))}
                </div>
              </div>
            )}

            {/* Scheduled: preset + custom */}
            {selectedMode === "scheduled" && (
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] text-[var(--text-3)] mb-2">Schedule Preset</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(SCHEDULE_PRESETS) as SchedulePreset[]).map((p) => (
                      <Pill key={p} active={schedulePreset === p} onClick={() => setSchedulePreset(p)}>
                        {SCHEDULE_PRESETS[p].label}
                      </Pill>
                    ))}
                  </div>
                </div>

                {schedulePreset !== "custom" && (
                  <p className="text-[11px] text-[var(--text-3)]">
                    UTC window: {SCHEDULE_PRESETS[schedulePreset].start}–{SCHEDULE_PRESETS[schedulePreset].end}
                  </p>
                )}

                {schedulePreset === "custom" && (
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-[11px] text-[var(--text-3)] mb-1">Start (UTC HH:MM)</p>
                      <input
                        type="text"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        placeholder="14:30"
                        className="w-24 px-2 py-1 rounded text-sm font-mono"
                        style={{
                          background: "var(--bg-raised)",
                          border: "1px solid var(--border)",
                          color: "var(--text-1)",
                        }}
                      />
                    </div>
                    <div className="mt-4 text-[var(--text-3)]">→</div>
                    <div>
                      <p className="text-[11px] text-[var(--text-3)] mb-1">End (UTC HH:MM)</p>
                      <input
                        type="text"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        placeholder="21:00"
                        className="w-24 px-2 py-1 rounded text-sm font-mono"
                        style={{
                          background: "var(--bg-raised)",
                          border: "1px solid var(--border)",
                          color: "var(--text-1)",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Continuous hint */}
            {selectedMode === "continuous" && (
              <p className="text-[11px] text-[var(--text-3)]">
                Bot runs every ~5 minutes indefinitely until stopped.
              </p>
            )}
          </>
        )}

        {/* CTA button */}
        <div className="flex items-center gap-3">
          {!bot?.is_running ? (
            <button
              onClick={startBot}
              disabled={botLoading || daysLeft === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: "var(--green)", color: "#000" }}
            >
              <IconPlay size={13} />
              {botLoading ? "Starting…" : daysLeft === 0 ? "Experiment Complete" : "Start Bot"}
            </button>
          ) : (
            <>
              <button
                onClick={() => stopBot(false)}
                disabled={botLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                style={{
                  background: "transparent",
                  border: "1.5px solid var(--red)",
                  color: "var(--red)",
                }}
              >
                <IconX size={13} />
                {botLoading ? "Stopping…" : "Stop Bot"}
              </button>
              {openPositions.length > 0 && (
                <button
                  onClick={() => stopBot(true)}
                  disabled={botLoading}
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                  style={{
                    background: "var(--red-dim)",
                    color: "var(--red)",
                    border: "1px solid var(--border)",
                  }}
                >
                  Stop + Close All
                </button>
              )}
            </>
          )}
        </div>

        {/* Stats row */}
        {bot && (
          <div
            className="flex flex-wrap gap-4 pt-1 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="text-[11px] text-[var(--text-3)]">
              Last cycle: <span className="text-[var(--text-2)]">{timeAgo(bot.last_cycle_at)}</span>
            </span>
            <span className="text-[11px] text-[var(--text-3)]">
              Total cycles: <span className="text-[var(--text-2)]">{bot.total_cycles}</span>
            </span>
            {bot.is_running && (
              <span className="text-[11px] text-[var(--text-3)]">
                Next: <span className="text-[var(--text-2)]">{nextCycleIn(bot.last_cycle_at)}</span>
              </span>
            )}
            {bot.is_running && bot.mode === "timed" && bot.run_until && (
              <span className="text-[11px] text-[var(--text-3)]">
                Runs until:{" "}
                <span className="text-[var(--text-2)]">
                  {new Date(bot.run_until).toLocaleString()}
                </span>
              </span>
            )}
            {bot.is_running && bot.mode === "scheduled" && bot.schedule_start && (
              <span className="text-[11px] text-[var(--text-3)]">
                Window: <span className="text-[var(--text-2)]">{bot.schedule_start}–{bot.schedule_end} UTC</span>
              </span>
            )}
          </div>
        )}

        {/* Hint */}
        <p className="text-[10px] text-[var(--text-3)] flex items-center gap-1">
          <IconActivity size={10} />
          Cycles fire every ~5 min via cron · Also driven by this page when open
        </p>

        {/* Activity log */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
          <p className="text-[11px] font-medium text-[var(--text-3)] mb-2">Activity Log</p>
          <ActivityLog entries={log.slice(0, 10)} />
        </div>
      </div>

      {/* ── 10-day progress bar ── */}
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
        <div className="h-1.5 w-full rounded-full" style={{ background: "var(--bg-raised)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progressPct}%`, background: "var(--green)" }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          {Array.from({ length: wallet.experiment_days }, (_, i) => (
            <span
              key={i}
              className="text-[9px]"
              style={{ color: i < day - 1 ? "var(--green)" : "var(--text-3)" }}
            >
              {i + 1}
            </span>
          ))}
        </div>
      </div>

      {/* ── Section 2: Portfolio Summary ── */}
      <div className="card p-5" style={{ background: "var(--bg-card)" }}>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div>
            <p className="text-[11px] text-[var(--text-3)] mb-1">Portfolio Value</p>
            <p className="num text-4xl font-bold text-white">${fmt(portfolioValue)}</p>
            <p
              className="num text-sm font-medium mt-1"
              style={{ color: isPos ? "var(--green)" : "var(--red)" }}
            >
              {fmtUsd(totalReturn)} ({fmtPct(totalReturnPct)}) total return
            </p>
          </div>
        </div>

        {/* ── Section 3: Key Stats Grid ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
          {[
            { label: "Cash", value: `$${fmt(cashBalance)}`, sub: "available", color: "text-white" },
            {
              label: "Realized P&L",
              value: fmtUsd(realizedPnl),
              sub: "closed trades",
              color: realizedPnl >= 0 ? "var(--green)" : "var(--red)",
            },
            {
              label: "Unrealized P&L",
              value: fmtUsd(unrealizedPnl),
              sub: "open positions",
              color: unrealizedPnl >= 0 ? "var(--green)" : "var(--red)",
            },
            {
              label: "Win Rate",
              value: closedTrades.length > 0 ? `${Math.round(winRate * 100)}%` : "—",
              sub:
                closedTrades.length > 0
                  ? `${closedTrades.filter((t) => t.pnl > 0).length}/${closedTrades.length} trades`
                  : "no closed trades",
              color: "text-white",
            },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: "var(--bg-raised)" }}>
              <p className="text-[11px] text-[var(--text-3)]">{label}</p>
              <p
                className="num text-lg font-bold mt-1 leading-none"
                style={{ color: color.startsWith("var") ? color : undefined }}
              >
                {value}
              </p>
              <p className="text-[10px] text-[var(--text-3)] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* P&L chart */}
        {snapshots.length > 0 ? (
          <PnlChart snapshots={snapshots} initial={wallet.initial_balance} />
        ) : (
          <div
            className="flex items-center justify-center h-32 rounded-xl"
            style={{ background: "var(--bg-raised)" }}
          >
            <p className="text-sm text-[var(--text-3)]">Start the bot to begin tracking performance</p>
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
                  <p className="num text-lg font-bold" style={{ color: "var(--green)" }}>{fmtUsd(bestTrade.pnl)}</p>
                  <p className="num text-xs" style={{ color: "var(--green)" }}>{fmtPct(bestTrade.pnl_pct)}</p>
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
                  <p className="num text-lg font-bold" style={{ color: "var(--red)" }}>{fmtUsd(worstTrade.pnl)}</p>
                  <p className="num text-xs" style={{ color: "var(--red)" }}>{fmtPct(worstTrade.pnl_pct)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Section 4: Open Positions ── */}
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
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Stock", "Entry", "Current", "Shares", "Cost Basis", "Mkt Value", "Unreal. P&L"].map(
                    (h, i) => (
                      <th
                        key={h}
                        className={`pb-2.5 text-[11px] font-medium text-[var(--text-3)] ${i === 0 ? "text-left" : "text-right"}`}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody style={{ borderTop: "none" }}>
                {openPositions.map((pos) => {
                  const isGain = pos.unrealizedPnl >= 0;
                  return (
                    <tr
                      key={pos.id}
                      className="transition-colors"
                      style={{ borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--bg-raised)")
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <td className="py-3">
                        <p className="font-semibold text-sm text-white">{pos.stocks.ticker}</p>
                        <p className="text-[10px] text-[var(--text-3)]">
                          {Math.round(pos.entry_confidence * 100)}% conf
                        </p>
                      </td>
                      <td className="num py-3 text-right text-sm text-[var(--text-2)]">
                        ${pos.entry_price.toFixed(2)}
                      </td>
                      <td className="num py-3 text-right text-sm text-white">
                        ${pos.currentPrice.toFixed(2)}
                      </td>
                      <td className="num py-3 text-right text-sm text-[var(--text-2)]">
                        {pos.shares.toFixed(4)}
                      </td>
                      <td className="num py-3 text-right text-sm text-[var(--text-2)]">
                        ${fmt(pos.cost_basis)}
                      </td>
                      <td className="num py-3 text-right text-sm text-white">
                        ${fmt(pos.marketValue)}
                      </td>
                      <td className="num py-3 text-right">
                        <p
                          className="text-sm font-semibold"
                          style={{ color: isGain ? "var(--green)" : "var(--red)" }}
                        >
                          {fmtUsd(pos.unrealizedPnl)}
                        </p>
                        <p
                          className="text-[10px]"
                          style={{ color: isGain ? "var(--green)" : "var(--red)" }}
                        >
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

      {/* ── Section 5: Closed Trades ── */}
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
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Stock", "Entry", "Exit", "Shares", "P&L", "Return", "Reason", "Held"].map(
                    (h, i) => (
                      <th
                        key={h}
                        className={`pb-2.5 text-[11px] font-medium text-[var(--text-3)] ${i === 0 ? "text-left" : "text-right"}`}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {closedTrades.slice(0, 20).map((trade) => {
                  const isWin = trade.pnl >= 0;
                  const heldMs =
                    new Date(trade.closed_at).getTime() - new Date(trade.opened_at).getTime();
                  const heldHrs = Math.round(heldMs / 3600000);
                  const heldLabel = heldHrs >= 24 ? `${Math.round(heldHrs / 24)}d` : `${heldHrs}h`;
                  return (
                    <tr
                      key={trade.id}
                      className="transition-colors"
                      style={{ borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--bg-raised)")
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <td className="py-3">
                        <p className="font-semibold text-sm text-white">{trade.stocks.ticker}</p>
                        <p className="text-[10px] text-[var(--text-3)]">
                          {Math.round(trade.entry_confidence * 100)}% conf
                        </p>
                      </td>
                      <td className="num py-3 text-right text-sm text-[var(--text-2)]">
                        ${trade.entry_price.toFixed(2)}
                      </td>
                      <td className="num py-3 text-right text-sm text-[var(--text-2)]">
                        ${trade.exit_price?.toFixed(2)}
                      </td>
                      <td className="num py-3 text-right text-sm text-[var(--text-2)]">
                        {trade.shares.toFixed(4)}
                      </td>
                      <td
                        className="num py-3 text-right text-sm font-semibold"
                        style={{ color: isWin ? "var(--green)" : "var(--red)" }}
                      >
                        {fmtUsd(trade.pnl)}
                      </td>
                      <td
                        className="num py-3 text-right text-sm"
                        style={{ color: isWin ? "var(--green)" : "var(--red)" }}
                      >
                        {fmtPct(trade.pnl_pct)}
                      </td>
                      <td className="py-3 text-right text-[10px] text-[var(--text-3)]">
                        {trade.close_reason?.replace(/_/g, " ")}
                      </td>
                      <td className="num py-3 text-right text-xs text-[var(--text-3)]">
                        {heldLabel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="pt-2 text-center text-xs text-[var(--text-3)]">
        Paper trading only · No real money involved · Results do not constitute financial advice
      </p>
    </div>
  );
}
