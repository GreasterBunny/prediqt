import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stock, Price } from "@/types";
import { runPrediction } from "./predictions";

export const STARTING_BALANCE = 10_000;
export const EXPERIMENT_DAYS = 10;
export const MIN_CONFIDENCE = 0.62;
export const MAX_POSITION_PCT = 0.16; // 16% of balance per stock (~6 stocks)

export interface WalletRow {
  id: string;
  created_at: string;
  started_at: string;
  initial_balance: number;
  cash_balance: number;
  experiment_days: number;
  is_active: boolean;
  // Bot control fields
  is_running: boolean;
  mode: "manual" | "continuous" | "timed" | "scheduled";
  run_until: string | null;
  schedule_start: string | null; // "HH:MM" UTC
  schedule_end: string | null;   // "HH:MM" UTC
  last_cycle_at: string | null;
  total_cycles: number;
}

export interface TradeRow {
  id: string;
  wallet_id: string;
  stock_id: string;
  direction: "long" | "short";
  status: "open" | "closed";
  opened_at: string;
  entry_price: number;
  shares: number;
  cost_basis: number;
  entry_confidence: number;
  entry_prediction: "up" | "down";
  closed_at?: string;
  exit_price?: number;
  proceeds?: number;
  pnl?: number;
  pnl_pct?: number;
  close_reason?: string;
}

export interface SnapshotRow {
  snapshot_date: string;
  portfolio_value: number;
  cash_balance: number;
  realized_pnl: number;
  unrealized_pnl: number;
}

export interface TradeAction {
  ticker: string;
  action: "buy" | "sell" | "hold" | "skip";
  reason: string;
  price: number;
  shares?: number;
  cost?: number;
  pnl?: number;
}

export interface ExecuteResult {
  day: number;
  daysLeft: number;
  actions: TradeAction[];
  cashBalance: number;
  portfolioValue: number;
  snapshotSaved: boolean;
}

export interface ShouldRunResult {
  run: boolean;
  reason: string;
}

export interface TickResult {
  ran: boolean;
  reason?: string;
  result?: ExecuteResult;
}

/** Get or create the active wallet */
export async function getOrCreateWallet(supabase: SupabaseClient): Promise<WalletRow> {
  const { data } = await supabase
    .from("paper_wallet")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (data) return data as WalletRow;

  const { data: created, error } = await supabase
    .from("paper_wallet")
    .insert({
      initial_balance: STARTING_BALANCE,
      cash_balance: STARTING_BALANCE,
      experiment_days: EXPERIMENT_DAYS,
    })
    .select()
    .single();

  if (error || !created) throw new Error("Failed to create wallet: " + error?.message);
  return created as WalletRow;
}

/**
 * Parse "HH:MM" string into total minutes from midnight (UTC).
 * Returns null if invalid format.
 */
function parseHHMM(hhmm: string): number | null {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hours = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  if (hours > 23 || mins > 59) return null;
  return hours * 60 + mins;
}

/**
 * Check if the current UTC time falls within a scheduled window.
 * Handles overnight windows (where end < start).
 */
function isWithinScheduledWindow(scheduleStart: string, scheduleEnd: string): boolean {
  const startMins = parseHHMM(scheduleStart);
  const endMins = parseHHMM(scheduleEnd);
  if (startMins === null || endMins === null) return false;

  const now = new Date();
  const currentMins = now.getUTCHours() * 60 + now.getUTCMinutes();

  if (startMins <= endMins) {
    // Normal window (e.g. 09:00–17:00)
    return currentMins >= startMins && currentMins < endMins;
  } else {
    // Overnight window (e.g. 21:00–01:00)
    return currentMins >= startMins || currentMins < endMins;
  }
}

/**
 * Determine whether the bot should run right now.
 * Also enforces a 4-minute idempotency guard to prevent double-execution.
 */
export function shouldBotRun(wallet: WalletRow): ShouldRunResult {
  if (!wallet.is_running) {
    return { run: false, reason: "Bot is not running" };
  }

  // Idempotency check: don't run again within 4 minutes of the last cycle
  if (wallet.last_cycle_at !== null) {
    const lastMs = new Date(wallet.last_cycle_at).getTime();
    const diffMs = Date.now() - lastMs;
    if (diffMs < 4 * 60 * 1000) {
      return {
        run: false,
        reason: `Last cycle was ${Math.round(diffMs / 1000)}s ago — waiting for 4-minute cooldown`,
      };
    }
  }

  if (wallet.mode === "continuous") {
    return { run: true, reason: "Continuous mode — always run" };
  }

  if (wallet.mode === "timed") {
    if (!wallet.run_until) {
      return { run: false, reason: "Timed mode but no run_until set" };
    }
    const expiry = new Date(wallet.run_until).getTime();
    if (Date.now() >= expiry) {
      return { run: false, reason: "Timed mode — window has expired" };
    }
    return { run: true, reason: "Within timed window" };
  }

  if (wallet.mode === "scheduled") {
    if (!wallet.schedule_start || !wallet.schedule_end) {
      return { run: false, reason: "Scheduled mode but no schedule times set" };
    }
    const inWindow = isWithinScheduledWindow(wallet.schedule_start, wallet.schedule_end);
    if (!inWindow) {
      return { run: false, reason: `Outside scheduled window (${wallet.schedule_start}–${wallet.schedule_end} UTC)` };
    }
    return { run: true, reason: `Within scheduled window (${wallet.schedule_start}–${wallet.schedule_end} UTC)` };
  }

  // manual mode — is_running was set explicitly by user action, run once
  if (wallet.mode === "manual") {
    return { run: true, reason: "Manual trigger" };
  }

  return { run: false, reason: "Unknown mode" };
}

/**
 * Tick the bot: check if it should run, execute a cycle if so,
 * update metadata, and auto-stop timed bots when expired.
 */
export async function tickBot(supabase: SupabaseClient): Promise<TickResult> {
  const wallet = await getOrCreateWallet(supabase);
  const { run, reason } = shouldBotRun(wallet);

  if (!run) {
    // Auto-stop timed mode if expired
    if (wallet.is_running && wallet.mode === "timed" && wallet.run_until) {
      if (Date.now() >= new Date(wallet.run_until).getTime()) {
        await supabase
          .from("paper_wallet")
          .update({ is_running: false })
          .eq("id", wallet.id);
      }
    }
    return { ran: false, reason };
  }

  // Execute the cycle
  const result = await executeBotCycle(supabase);

  // Update last_cycle_at and total_cycles
  const updates: Record<string, unknown> = {
    last_cycle_at: new Date().toISOString(),
    total_cycles: wallet.total_cycles + 1,
  };

  // Auto-stop timed mode if now expired
  if (wallet.mode === "timed" && wallet.run_until) {
    if (Date.now() >= new Date(wallet.run_until).getTime()) {
      updates.is_running = false;
    }
  }

  // Auto-stop manual mode after one cycle
  if (wallet.mode === "manual") {
    updates.is_running = false;
  }

  await supabase
    .from("paper_wallet")
    .update(updates)
    .eq("id", wallet.id);

  return { ran: true, result };
}

/** Run one bot cycle: check predictions, open/close positions, snapshot */
export async function executeBotCycle(
  supabase: SupabaseClient,
  options?: { forceCloseAll?: boolean }
): Promise<ExecuteResult> {
  const wallet = await getOrCreateWallet(supabase);
  const actions: TradeAction[] = [];

  // How many days in?
  const startedAt = new Date(wallet.started_at).getTime();
  const day = Math.floor((Date.now() - startedAt) / 86400000) + 1;
  const daysLeft = Math.max(0, EXPERIMENT_DAYS - day + 1);

  // Get all stocks
  const { data: stocks } = await supabase.from("stocks").select("*");
  if (!stocks?.length) throw new Error("No stocks found");

  // Get open positions
  const { data: openTrades } = await supabase
    .from("paper_trades")
    .select("*")
    .eq("wallet_id", wallet.id)
    .eq("status", "open");

  const positions = (openTrades ?? []) as TradeRow[];
  const positionsByStockId = Object.fromEntries(positions.map((p) => [p.stock_id, p]));

  let cashBalance = wallet.cash_balance;
  let unrealizedPnl = 0;

  // If forceCloseAll — close every open position immediately
  if (options?.forceCloseAll && positions.length > 0) {
    for (const pos of positions) {
      // Get current price
      const { data: latestPx } = await supabase
        .from("prices")
        .select("close")
        .eq("stock_id", pos.stock_id)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      const currentPrice = (latestPx as { close: number } | null)?.close ?? pos.entry_price;
      const proceeds = pos.shares * currentPrice;
      const pnl = proceeds - pos.cost_basis;
      const pnl_pct = pnl / pos.cost_basis;

      await supabase
        .from("paper_trades")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          exit_price: currentPrice,
          proceeds,
          pnl,
          pnl_pct,
          close_reason: "force_closed",
        })
        .eq("id", pos.id);

      cashBalance += proceeds;

      // Get ticker for log
      const stock = (stocks as Stock[]).find((s) => s.id === pos.stock_id);
      actions.push({
        ticker: stock?.ticker ?? pos.stock_id,
        action: "sell",
        reason: "Force closed by stop command",
        price: currentPrice,
        shares: pos.shares,
        pnl,
      });
    }

    await supabase
      .from("paper_wallet")
      .update({ cash_balance: cashBalance })
      .eq("id", wallet.id);

    const portfolioValue = cashBalance;
    const today = new Date().toISOString().slice(0, 10);
    const { data: realizedData } = await supabase
      .from("paper_trades")
      .select("pnl")
      .eq("wallet_id", wallet.id)
      .eq("status", "closed");
    const realizedPnl = (realizedData ?? []).reduce(
      (s: number, t: { pnl: number | null }) => s + (t.pnl ?? 0),
      0
    );

    const { error: snapError } = await supabase.from("paper_snapshots").upsert({
      wallet_id: wallet.id,
      snapshot_date: today,
      portfolio_value: portfolioValue,
      cash_balance: cashBalance,
      realized_pnl: realizedPnl,
      unrealized_pnl: 0,
    });

    return { day, daysLeft, actions, cashBalance, portfolioValue, snapshotSaved: !snapError };
  }

  // Normal cycle — process each stock
  for (const stock of stocks as Stock[]) {
    // Get price history
    const { data: prices } = await supabase
      .from("prices")
      .select("*")
      .eq("stock_id", stock.id)
      .order("timestamp", { ascending: true })
      .limit(200);

    if (!prices?.length) {
      actions.push({ ticker: stock.ticker, action: "skip", reason: "No price data", price: 0 });
      continue;
    }

    const typedPrices = prices as Price[];
    const currentPrice = typedPrices[typedPrices.length - 1].close;
    const prediction = runPrediction(typedPrices);
    const openPosition = positionsByStockId[stock.id];

    if (openPosition) {
      const unrealized = (currentPrice - openPosition.entry_price) * openPosition.shares;
      unrealizedPnl += unrealized;

      // Close if prediction flipped or experiment ending
      const shouldClose =
        prediction.prediction === "down" ||
        daysLeft <= 1 ||
        prediction.confidence < MIN_CONFIDENCE;

      if (shouldClose) {
        const proceeds = openPosition.shares * currentPrice;
        const pnl = proceeds - openPosition.cost_basis;
        const pnl_pct = pnl / openPosition.cost_basis;
        const close_reason = daysLeft <= 1 ? "experiment_end" : "prediction_flip";

        await supabase
          .from("paper_trades")
          .update({
            status: "closed",
            closed_at: new Date().toISOString(),
            exit_price: currentPrice,
            proceeds,
            pnl,
            pnl_pct,
            close_reason,
          })
          .eq("id", openPosition.id);

        cashBalance += proceeds;
        actions.push({
          ticker: stock.ticker,
          action: "sell",
          reason: close_reason === "experiment_end" ? "Experiment ending" : "Prediction flipped bearish",
          price: currentPrice,
          shares: openPosition.shares,
          pnl,
        });
      } else {
        actions.push({
          ticker: stock.ticker,
          action: "hold",
          reason: `Holding long — ${Math.round(prediction.confidence * 100)}% confidence`,
          price: currentPrice,
        });
      }
    } else {
      // No position — consider opening one
      if (prediction.prediction === "up" && prediction.confidence >= MIN_CONFIDENCE && daysLeft > 1) {
        const maxAlloc = wallet.initial_balance * MAX_POSITION_PCT;
        const alloc = Math.min(cashBalance * MAX_POSITION_PCT, maxAlloc);

        if (alloc < 50) {
          actions.push({ ticker: stock.ticker, action: "skip", reason: "Insufficient cash", price: currentPrice });
          continue;
        }

        const shares = parseFloat((alloc / currentPrice).toFixed(6));
        const cost_basis = shares * currentPrice;

        const { error: insertError } = await supabase.from("paper_trades").insert({
          wallet_id: wallet.id,
          stock_id: stock.id,
          direction: "long",
          status: "open",
          entry_price: currentPrice,
          shares,
          cost_basis,
          entry_confidence: prediction.confidence,
          entry_prediction: "up",
        });

        if (!insertError) {
          cashBalance -= cost_basis;
          actions.push({
            ticker: stock.ticker,
            action: "buy",
            reason: `${Math.round(prediction.confidence * 100)}% bullish confidence`,
            price: currentPrice,
            shares,
            cost: cost_basis,
          });
        }
      } else {
        const reason =
          prediction.prediction === "down"
            ? "Bearish signal — no position"
            : prediction.confidence < MIN_CONFIDENCE
            ? `Confidence too low (${Math.round(prediction.confidence * 100)}%)`
            : "Experiment ending soon";
        actions.push({ ticker: stock.ticker, action: "skip", reason, price: currentPrice });
      }
    }
  }

  // Update wallet cash balance
  await supabase
    .from("paper_wallet")
    .update({ cash_balance: cashBalance })
    .eq("id", wallet.id);

  // Compute portfolio value (cash + open position market values)
  const { data: stillOpen } = await supabase
    .from("paper_trades")
    .select("*, stocks(ticker)")
    .eq("wallet_id", wallet.id)
    .eq("status", "open");

  let openValue = 0;
  for (const pos of (stillOpen ?? []) as (TradeRow & { stocks: { ticker: string } })[]) {
    const { data: latestPrice } = await supabase
      .from("prices")
      .select("close")
      .eq("stock_id", pos.stock_id)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();
    if (latestPrice) openValue += pos.shares * (latestPrice as { close: number }).close;
  }

  const portfolioValue = cashBalance + openValue;

  // Save daily snapshot (upsert so re-running same day is safe)
  const today = new Date().toISOString().slice(0, 10);
  const { data: realizedData } = await supabase
    .from("paper_trades")
    .select("pnl")
    .eq("wallet_id", wallet.id)
    .eq("status", "closed");
  const realizedPnl = (realizedData ?? []).reduce((s: number, t: { pnl: number | null }) => s + (t.pnl ?? 0), 0);

  const { error: snapError } = await supabase.from("paper_snapshots").upsert({
    wallet_id: wallet.id,
    snapshot_date: today,
    portfolio_value: portfolioValue,
    cash_balance: cashBalance,
    realized_pnl: realizedPnl,
    unrealized_pnl: openValue - positions.reduce((s, p) => s + p.cost_basis, 0),
  });

  return {
    day,
    daysLeft,
    actions,
    cashBalance,
    portfolioValue,
    snapshotSaved: !snapError,
  };
}
