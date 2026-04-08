/**
 * POST /api/fetch-prices
 *
 * Fetches real OHLCV price data and upserts into Supabase.
 *
 * Query params:
 *   mode=daily    (default) — fetch last ~5 days, catches up after weekends/holidays
 *   mode=backfill — fetch last 100 days, for initial data population
 *   ticker=AAPL   — optional, limit to a single ticker
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { fetchAllTickers, fetchPriceHistory, detectDataSource } from "@/services/market-data";
import type { Stock } from "@/types";

export const dynamic = "force-dynamic";
// Give price fetching up to 60 seconds on Vercel
export const maxDuration = 60;

const STOCK_TICKERS = ["AAPL", "MSFT", "NVDA", "GOOG", "AMZN", "META"];

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") ?? "daily";
  const singleTicker = searchParams.get("ticker")?.toUpperCase();
  const days = mode === "backfill" ? 100 : 7; // 7-day window catches any gaps

  const source = detectDataSource();
  const tickers = singleTicker ? [singleTicker] : STOCK_TICKERS;

  // Fetch all stocks from DB to get their UUIDs
  const { data: stocks, error: stocksErr } = await supabase
    .from("stocks")
    .select("id, ticker");

  if (stocksErr || !stocks?.length) {
    return NextResponse.json({ error: "Could not load stocks from DB" }, { status: 500 });
  }

  const stockMap = new Map(
    (stocks as Stock[]).map((s) => [s.ticker, s.id])
  );

  const summary: Array<{
    ticker: string;
    inserted: number;
    skipped: number;
    error?: string;
  }> = [];

  // Fetch each ticker (delay 250ms between calls for Polygon free tier)
  for (const ticker of tickers) {
    const stockId = stockMap.get(ticker);
    if (!stockId) {
      summary.push({ ticker, inserted: 0, skipped: 0, error: "Not found in DB" });
      continue;
    }

    try {
      const result = await fetchPriceHistory(ticker, days);

      if (result.bars.length === 0) {
        summary.push({ ticker, inserted: 0, skipped: 0, error: "No data returned from source" });
        continue;
      }

      // Build rows to upsert
      const rows = result.bars.map((bar) => ({
        stock_id:  stockId,
        timestamp: `${bar.date}T16:00:00.000Z`, // Market close time (4 PM ET = 20:00 UTC but stored as date)
        open:      bar.open,
        high:      bar.high,
        low:       bar.low,
        close:     bar.close,
        volume:    bar.volume,
      }));

      // Upsert — unique(stock_id, timestamp) handles deduplication
      const { error: upsertErr } = await supabase
        .from("prices")
        .upsert(rows, { onConflict: "stock_id,timestamp", ignoreDuplicates: true });

      if (upsertErr) {
        summary.push({ ticker, inserted: 0, skipped: rows.length, error: upsertErr.message });
      } else {
        summary.push({ ticker, inserted: rows.length, skipped: 0 });
      }
    } catch (err) {
      summary.push({ ticker, inserted: 0, skipped: 0, error: String(err) });
    }
  }

  const totalInserted = summary.reduce((s, r) => s + r.inserted, 0);
  const errors = summary.filter((r) => r.error);

  return NextResponse.json({
    mode,
    source,
    tickers: tickers.length,
    totalInserted,
    errors: errors.length,
    summary,
    timestamp: new Date().toISOString(),
  });
}

/** GET /api/fetch-prices — returns current data status per stock */
export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const source = detectDataSource();

  // Get latest price date + row count per stock
  const { data: stocks } = await supabase
    .from("stocks")
    .select("id, ticker, name");

  if (!stocks) return NextResponse.json({ source, stocks: [] });

  const statusRows = await Promise.all(
    (stocks as Stock[]).map(async (stock) => {
      const { data: latest } = await supabase
        .from("prices")
        .select("timestamp, close")
        .eq("stock_id", stock.id)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      const { count } = await supabase
        .from("prices")
        .select("id", { count: "exact", head: true })
        .eq("stock_id", stock.id);

      return {
        ticker: stock.ticker,
        name: stock.name,
        latestDate: latest?.timestamp?.split("T")[0] ?? null,
        latestClose: latest?.close ?? null,
        rowCount: count ?? 0,
      };
    })
  );

  // Determine staleness
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];

  const isStale = statusRows.some(
    (r) => !r.latestDate || (r.latestDate < yesterday && new Date().getDay() !== 0 && new Date().getDay() !== 6)
  );

  return NextResponse.json({
    source,
    isStale,
    today,
    stocks: statusRows,
    timestamp: new Date().toISOString(),
  });
}
