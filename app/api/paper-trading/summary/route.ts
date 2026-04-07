import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getOrCreateWallet } from "@/services/paper-trading";
import type { TradeRow } from "@/services/paper-trading";

export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  try {
    const wallet = await getOrCreateWallet(supabase);

    // All trades for this wallet with stock ticker
    const { data: trades } = await supabase
      .from("paper_trades")
      .select("*, stocks(ticker, name)")
      .eq("wallet_id", wallet.id)
      .order("opened_at", { ascending: false });

    const allTrades = (trades ?? []) as (TradeRow & { stocks: { ticker: string; name: string } })[];
    const openTrades = allTrades.filter((t) => t.status === "open");
    const closedTrades = allTrades.filter((t) => t.status === "closed");

    // Compute unrealized P&L for open positions
    let openValue = 0;
    const openPositions = await Promise.all(
      openTrades.map(async (trade) => {
        const { data: px } = await supabase
          .from("prices")
          .select("close, timestamp")
          .eq("stock_id", trade.stock_id)
          .order("timestamp", { ascending: false })
          .limit(1)
          .single();

        const currentPrice = (px as { close: number } | null)?.close ?? trade.entry_price;
        const marketValue = trade.shares * currentPrice;
        const unrealizedPnl = marketValue - trade.cost_basis;
        const unrealizedPct = unrealizedPnl / trade.cost_basis;
        openValue += marketValue;

        return {
          ...trade,
          currentPrice,
          marketValue,
          unrealizedPnl,
          unrealizedPct,
        };
      })
    );

    const portfolioValue = wallet.cash_balance + openValue;
    const totalReturn = portfolioValue - wallet.initial_balance;
    const totalReturnPct = totalReturn / wallet.initial_balance;

    const realizedPnl = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const unrealizedPnl = openValue - openTrades.reduce((s, t) => s + t.cost_basis, 0);

    const winningTrades = closedTrades.filter((t) => (t.pnl ?? 0) > 0);
    const winRate = closedTrades.length > 0 ? winningTrades.length / closedTrades.length : 0;
    const avgPnl = closedTrades.length > 0
      ? closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0) / closedTrades.length
      : 0;
    const bestTrade = closedTrades.reduce<TradeRow | null>(
      (best, t) => (!best || (t.pnl ?? 0) > (best.pnl ?? 0) ? t : best), null
    );
    const worstTrade = closedTrades.reduce<TradeRow | null>(
      (worst, t) => (!worst || (t.pnl ?? 0) < (worst.pnl ?? 0) ? t : worst), null
    );

    // Daily snapshots for chart
    const { data: snapshots } = await supabase
      .from("paper_snapshots")
      .select("*")
      .eq("wallet_id", wallet.id)
      .order("snapshot_date", { ascending: true });

    // Day progress
    const startedAt = new Date(wallet.started_at).getTime();
    const day = Math.min(Math.floor((Date.now() - startedAt) / 86400000) + 1, wallet.experiment_days);
    const daysLeft = Math.max(0, wallet.experiment_days - day + 1);

    return NextResponse.json({
      wallet,
      day,
      daysLeft,
      portfolioValue,
      cashBalance: wallet.cash_balance,
      totalReturn,
      totalReturnPct,
      realizedPnl,
      unrealizedPnl,
      openPositions,
      closedTrades,
      winRate,
      avgPnl,
      bestTrade,
      worstTrade,
      snapshots: snapshots ?? [],
    });
  } catch (err) {
    console.error("[paper-trading/summary]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
