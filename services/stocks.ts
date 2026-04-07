import { getSupabaseClient } from "@/lib/supabaseClient";
import { MOCK_STOCKS, getMockStock } from "@/mock/data";
import type { Stock, StockWithData } from "@/types";

/**
 * Returns all stocks with their latest price, prediction, indicators, and history.
 * Falls back to mock data if Supabase is not configured.
 */
export async function getAllStocks(): Promise<StockWithData[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return MOCK_STOCKS;

  const { data: stocks, error } = await supabase
    .from("stocks")
    .select("*")
    .order("ticker");

  if (error || !stocks || stocks.length === 0) {
    console.warn("[stocks] Supabase query failed, using mock data:", error?.message);
    return MOCK_STOCKS;
  }

  const results = await Promise.all(
    (stocks as Stock[]).map((stock) => getStockWithData(stock))
  );

  return results.filter(Boolean) as StockWithData[];
}

/**
 * Returns a single stock with all data by ticker.
 * Falls back to mock data if Supabase is not configured.
 */
export async function getStockByTicker(ticker: string): Promise<StockWithData | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return getMockStock(ticker) ?? null;

  const { data: stock, error } = await supabase
    .from("stocks")
    .select("*")
    .ilike("ticker", ticker)
    .single();

  if (error || !stock) {
    console.warn("[stocks] Supabase query failed, using mock data:", error?.message);
    return getMockStock(ticker) ?? null;
  }

  return getStockWithData(stock as Stock);
}

async function getStockWithData(stock: Stock): Promise<StockWithData | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const [pricesRes, latestPriceRes, predictionRes, indicatorsRes, predHistoryRes] =
    await Promise.all([
      // 60-day price history
      supabase
        .from("prices")
        .select("*")
        .eq("stock_id", stock.id)
        .order("timestamp", { ascending: true })
        .limit(60),

      // Latest price
      supabase
        .from("prices")
        .select("*")
        .eq("stock_id", stock.id)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single(),

      // Latest prediction
      supabase
        .from("predictions")
        .select("*")
        .eq("stock_id", stock.id)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single(),

      // Indicators
      supabase
        .from("indicators")
        .select("*")
        .eq("stock_id", stock.id)
        .single(),

      // Prediction history (last 10)
      supabase
        .from("predictions")
        .select("*")
        .eq("stock_id", stock.id)
        .order("timestamp", { ascending: false })
        .limit(10),
    ]);

  if (!latestPriceRes.data || !predictionRes.data || !indicatorsRes.data) {
    // Missing data — fall back to mock for this stock
    const mock = getMockStock(stock.ticker);
    return mock ?? null;
  }

  return {
    stock,
    latestPrice: latestPriceRes.data,
    prediction: predictionRes.data,
    indicators: indicatorsRes.data,
    priceHistory: pricesRes.data ?? [],
    predictionHistory: predHistoryRes.data ?? [],
  };
}
