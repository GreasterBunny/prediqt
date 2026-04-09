"use client";

import { useState, useEffect, useCallback } from "react";
import { IconWarning, IconCheck, IconX, IconChevronDown, IconChevronUp, IconRefresh, IconPlay, IconDot, IconDownload, IconDatabase, IconCpu, IconTarget, IconBot, IconClock, IconArrowRight, IconActivity } from "@/components/Icons";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StockStatus {
  ticker: string;
  name: string;
  latestDate: string | null;
  latestClose: number | null;
  rowCount: number;
}

interface DataStatus {
  source: "polygon" | "yahoo" | "none";
  isStale: boolean;
  today: string;
  stocks: StockStatus[];
  timestamp: string;
}

interface StepResult {
  step: string;
  ok: boolean;
  durationMs: number;
  data?: unknown;
  error?: string;
}

interface RunResult {
  success?: boolean;
  skipped?: boolean;
  reason?: string;
  totalDurationMs?: number;
  stepsRan?: number;
  timestamp?: string;
  steps?: StepResult[];
  // fetch-prices result
  mode?: string;
  totalInserted?: number;
  errors?: number;
  summary?: Array<{ ticker: string; inserted: number; skipped: number; error?: string }>;
  // run-predictions result
  ran?: number;
  results?: unknown[];
  // etc.
  [key: string]: unknown;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: "polygon" | "yahoo" | "none" }) {
  if (source === "polygon") {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: "rgba(34,197,94,0.12)", color: "var(--green)" }}>
        Polygon.io
      </span>
    );
  }
  if (source === "yahoo") {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: "rgba(161,161,170,0.12)", color: "var(--text-2)" }}>
        Yahoo Finance
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: "rgba(239,68,68,0.12)", color: "var(--red)" }}>
      No source
    </span>
  );
}

function FreshnessChip({ latestDate, today }: { latestDate: string | null; today: string }) {
  if (!latestDate) {
    return <span className="text-[10px] text-[var(--red)]">No data</span>;
  }
  const isToday = latestDate === today;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const isYesterday = latestDate === yesterday;
  const daysOld = Math.floor((Date.now() - new Date(latestDate).getTime()) / 86400000);

  if (isToday) return <span className="text-[10px] text-[var(--green)] font-semibold"><><IconDot size={6} className="inline mr-1" />Today</></span>;
  if (isYesterday) return <span className="text-[10px] text-[var(--green)]">Yesterday</span>;
  return <span className="text-[10px] text-[var(--red)]">{daysOld}d old</span>;
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
}

function StepRow({ result }: { result: StepResult }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
      <button
        className="w-full flex items-center justify-between p-3 text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2.5">
          <span className={`text-sm ${result.ok ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
            {result.ok ? <IconCheck size={11} className="inline" /> : <IconX size={11} className="inline" />}
          </span>
          <span className="text-xs font-medium text-white font-mono">{result.step}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="num text-[11px] text-[var(--text-3)]">{result.durationMs}ms</span>
          <span className="text-[var(--text-3)] text-[10px]">{expanded ? <IconChevronUp size={11} /> : <IconChevronDown size={11} />}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <pre className="text-[10px] text-[var(--text-2)] mt-2 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {JSON.stringify(result.data ?? result.error, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Step card (individual pipeline step with manual trigger) ─────────────────

interface StepCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  detail: string;
  onRun: () => Promise<RunResult>;
}

function StepCard({ icon, title, description, detail, onRun }: StepCardProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  async function handleRun() {
    setRunning(true);
    setResult(null);
    try {
      const res = await onRun();
      setResult(res);
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setRunning(false);
    }
  }

  const success = result && !result.error && result.success !== false;
  const failed = result && (result.error || result.success === false);

  return (
    <div className="card p-5" style={{ background: "var(--bg-card)" }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0" style={{ background: "var(--bg-hover)" }}>{icon}</span>
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-[11px] text-[var(--text-3)] mt-0.5">{description}</p>
          </div>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex-shrink-0"
          style={{
            background: running ? "var(--bg-raised)" : "rgba(255,255,255,0.08)",
            color: running ? "var(--text-3)" : "white",
          }}
        >
          {running && <Spinner />}
          {running ? "Running…" : "Run"}
        </button>
      </div>
      <p className="text-[10px] text-[var(--text-3)] mb-3 ml-9">{detail}</p>

      {result && (
        <div
          className="mt-3 rounded-lg p-3 border-t text-xs"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={success ? "text-[var(--green)]" : "text-[var(--red)]"}>
              {success ? <><IconCheck size={11} className="inline" /> Success</> : <><IconX size={11} className="inline" /> Failed</>}
            </span>
          </div>
          <pre className="text-[10px] text-[var(--text-2)] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-32">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PipelineClient() {
  const [status, setStatus] = useState<DataStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<RunResult | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/fetch-prices");
      if (res.ok) setStatus(await res.json());
    } catch {
      // silent
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function runFull() {
    setPipelineRunning(true);
    setPipelineResult(null);
    try {
      const res = await fetch("/api/cron/daily", { method: "POST" });
      const data = await res.json() as RunResult;
      setPipelineResult(data);
      // Refresh status after pipeline runs
      await loadStatus();
    } catch (err) {
      setPipelineResult({ error: String(err), success: false });
    } finally {
      setPipelineRunning(false);
    }
  }

  // Individual step runners
  async function fetchPricesDaily(): Promise<RunResult> {
    const res = await fetch("/api/fetch-prices?mode=daily", { method: "POST" });
    const data = await res.json() as RunResult;
    await loadStatus();
    return data;
  }
  async function fetchPricesBackfill(): Promise<RunResult> {
    const res = await fetch("/api/fetch-prices?mode=backfill", { method: "POST" });
    const data = await res.json() as RunResult;
    await loadStatus();
    return data;
  }
  async function runPredictions(): Promise<RunResult> {
    const res = await fetch("/api/run-predictions", { method: "POST" });
    return res.json() as Promise<RunResult>;
  }
  async function resolvePredictions(): Promise<RunResult> {
    const res = await fetch("/api/resolve-predictions", { method: "POST" });
    return res.json() as Promise<RunResult>;
  }
  async function runPaperTrading(): Promise<RunResult> {
    const res = await fetch("/api/paper-trading/execute", { method: "POST" });
    return res.json() as Promise<RunResult>;
  }

  return (
    <div className="space-y-6">

      {/* Data Status */}
      <div className="card p-5" style={{ background: "var(--bg-card)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide uppercase">
              Price Data Status
            </p>
            {status && (
              <div className="flex items-center gap-2 mt-1">
                <SourceBadge source={status.source} />
                {status.isStale && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(239,68,68,0.12)", color: "var(--red)" }}>
                    <IconWarning size={11} className="inline mr-1" /> Data is stale
                  </span>
                )}
                {!status.isStale && status.stocks.some(s => s.rowCount > 0) && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(34,197,94,0.12)", color: "var(--green)" }}>
                    <IconCheck size={11} className="inline" /> Up to date
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={loadStatus}
            className="text-[11px] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
          >
            <><IconRefresh size={12} className="inline mr-1" />Refresh</>
          </button>
        </div>

        {statusLoading ? (
          <div className="flex items-center gap-2 text-[var(--text-3)] text-xs py-4">
            <Spinner />
            <span>Loading status…</span>
          </div>
        ) : status ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Ticker", "Name", "Latest Date", "Last Close", "Rows"].map(h => (
                    <th key={h} className="text-left pb-2 text-[var(--text-3)] font-medium pr-6 last:pr-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {status.stocks.map((s) => (
                  <tr key={s.ticker} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2.5 pr-6 font-semibold text-white">{s.ticker}</td>
                    <td className="py-2.5 pr-6 text-[var(--text-2)]">{s.name}</td>
                    <td className="py-2.5 pr-6">
                      <div className="flex items-center gap-2">
                        <span className="num text-[var(--text-2)]">{s.latestDate ?? "—"}</span>
                        <FreshnessChip latestDate={s.latestDate} today={status.today} />
                      </div>
                    </td>
                    <td className="py-2.5 pr-6 num text-[var(--text-2)]">
                      {s.latestClose != null ? `$${s.latestClose.toFixed(2)}` : "—"}
                    </td>
                    <td className="py-2.5 num text-[var(--text-2)]">
                      {s.rowCount > 0 ? s.rowCount : (
                        <span className="text-[var(--red)]">0 — no data</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-[var(--text-3)]">Could not load status. Is Supabase configured?</p>
        )}
      </div>

      {/* Run Full Pipeline */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(34,197,94,0.02))",
          border: "1px solid rgba(34,197,94,0.15)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-bold text-white">Run Full Pipeline</p>
            <p className="text-[11px] text-[var(--text-3)] mt-0.5">
              Executes all 4 steps in sequence: fetch prices → predict → resolve → trade
            </p>
          </div>
          <button
            onClick={runFull}
            disabled={pipelineRunning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-colors"
            style={{
              background: pipelineRunning ? "var(--bg-raised)" : "var(--green)",
              color: pipelineRunning ? "var(--text-3)" : "black",
            }}
          >
            {pipelineRunning && <Spinner />}
            {pipelineRunning ? "Running pipeline…" : <><IconPlay size={13} className="inline mr-1.5" />Run Now</>}
          </button>
        </div>

        {/* Pipeline result */}
        {pipelineResult && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-sm font-bold ${pipelineResult.success ? "text-[var(--green)]" : pipelineResult.skipped ? "text-[var(--text-2)]" : "text-[var(--red)]"}`}>
                {pipelineResult.skipped ? "Skipped" : pipelineResult.success ? <><IconCheck size={11} className="inline" /> Pipeline complete</> : <><IconX size={11} className="inline" /> Pipeline had errors</>}
              </span>
              {pipelineResult.totalDurationMs && (
                <span className="num text-[11px] text-[var(--text-3)]">
                  {(pipelineResult.totalDurationMs / 1000).toFixed(1)}s total
                </span>
              )}
              {pipelineResult.reason && (
                <span className="text-[11px] text-[var(--text-3)]">{pipelineResult.reason}</span>
              )}
            </div>
            {pipelineResult.steps?.map((step, i) => (
              <StepRow key={i} result={step} />
            ))}
          </div>
        )}
      </div>

      {/* Individual Steps */}
      <div>
        <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide uppercase mb-3">
          Manual Step Controls
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StepCard
            icon={<IconDownload size={15} />}
            title="Fetch Prices (Daily)"
            description="Pull last 7 days of OHLCV data"
            detail="POST /api/fetch-prices?mode=daily — upserts into prices table, deduplicates automatically"
            onRun={fetchPricesDaily}
          />
          <StepCard
            icon={<IconDatabase size={15} />}
            title="Backfill Prices (100 days)"
            description="Initial data population or gap fill"
            detail="POST /api/fetch-prices?mode=backfill — fetches 100 calendar days of history. Run once to seed the database."
            onRun={fetchPricesBackfill}
          />
          <StepCard
            icon={<IconCpu size={15} />}
            title="Run Predictions"
            description="AI prediction engine for all stocks"
            detail="POST /api/run-predictions — computes MA Crossover, RSI, MACD, Momentum signals and stores results"
            onRun={runPredictions}
          />
          <StepCard
            icon={<IconTarget size={15} />}
            title="Resolve Predictions"
            description="Grade yesterday's predictions"
            detail="POST /api/resolve-predictions — marks predictions correct/incorrect based on actual price movement"
            onRun={resolvePredictions}
          />
          <StepCard
            icon={<IconBot size={15} />}
            title="Paper Trading Bot"
            description="AI bot opens and closes positions"
            detail="POST /api/paper-trading/execute — bot reads new predictions, opens high-confidence trades, closes old ones"
            onRun={runPaperTrading}
          />
        </div>
      </div>

      {/* Cron schedule info */}
      <div className="card p-5" style={{ background: "var(--bg-card)" }}>
        <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide uppercase mb-4">
          Automation Schedule
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-raised)" }}>
            <IconClock size={16} className="text-[var(--text-3)]" />
            <div>
              <p className="text-xs font-semibold text-white">Daily Cron — Weekdays at 4 PM ET (21:00 UTC)</p>
              <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                Configured in <code className="text-[var(--text-2)]">vercel.json</code> · Schedule:{" "}
                <code className="text-[var(--text-2)]">0 21 * * 1-5</code>
              </p>
            </div>
            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(34,197,94,0.12)", color: "var(--green)" }}>
              Active on Vercel
            </span>
          </div>

          <div className="text-[11px] text-[var(--text-3)] space-y-1.5 pt-1">
            <div className="flex items-start gap-2">
              <IconArrowRight size={13} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
              <span><strong className="text-[var(--text-2)]">POLYGON_API_KEY</strong> — set in Vercel env vars for real-time data. Leave blank to use Yahoo Finance (free, no key needed).</span>
            </div>
            <div className="flex items-start gap-2">
              <IconArrowRight size={13} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
              <span><strong className="text-[var(--text-2)]">CRON_SECRET</strong> — set in Vercel env vars to secure the cron endpoint. Vercel auto-includes it as a Bearer token.</span>
            </div>
            <div className="flex items-start gap-2">
              <IconArrowRight size={13} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
              <span>On first deploy, click <strong className="text-[var(--text-2)]">Backfill Prices</strong> above to seed 100 days of historical data.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
