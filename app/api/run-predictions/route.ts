import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { runPrediction } from "@/services/predictions";
import { computeIndicators } from "@/services/indicators";
import type { Price, Stock } from "@/types";

/**
 * POST /api/run-predictions
 * Runs the prediction engine for all stocks and stores results in Supabase.
 * Intended to be called by a cron job or manually triggered.
 */
export async function POST() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { data: stocks, error: stocksError } = await supabase
    .from("stocks")
    .select("*");

  if (stocksError || !stocks?.length) {
    return NextResponse.json({ error: "No stocks found" }, { status: 404 });
  }

  const results = [];
  const errors = [];

  for (const stock of stocks as Stock[]) {
    try {
      // Fetch price history
      const { data: prices, error: pricesError } = await supabase
        .from("prices")
        .select("*")
        .eq("stock_id", stock.id)
        .order("timestamp", { ascending: true })
        .limit(200);

      if (pricesError || !prices?.length) {
        errors.push({ ticker: stock.ticker, error: "No price data" });
        continue;
      }

      const typedPrices = prices as Price[];

      // Run prediction engine
      const result = runPrediction(typedPrices);

      // Compute and upsert indicators
      const indicators = computeIndicators(typedPrices);
      await supabase.from("indicators").upsert({
        stock_id: stock.id,
        ...indicators,
        updated_at: new Date().toISOString(),
      });

      // Insert new prediction
      const { error: insertError } = await supabase.from("predictions").insert({
        stock_id: stock.id,
        timestamp: new Date().toISOString(),
        prediction: result.prediction,
        confidence: result.confidence,
        model_version: result.model_version,
      });

      if (insertError) {
        errors.push({ ticker: stock.ticker, error: insertError.message });
      } else {
        results.push({
          ticker: stock.ticker,
          prediction: result.prediction,
          confidence: result.confidence,
          signals: result.signals.map((s) => ({ name: s.name, direction: s.direction })),
        });
      }
    } catch (err) {
      errors.push({ ticker: stock.ticker, error: String(err) });
    }
  }

  return NextResponse.json({
    ran: results.length,
    errors: errors.length,
    results,
    ...(errors.length > 0 && { errorDetails: errors }),
  });
}
