import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";
import type { Price, Prediction } from "@/types";

/**
 * POST /api/resolve-predictions
 * Resolves the `actual` outcome for predictions older than 24 hours
 * by comparing the price at prediction time vs. 24h later.
 * Call this via cron job (e.g. daily).
 */
export async function POST() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Fetch unresolved predictions older than 24h
  const { data: predictions, error } = await supabase
    .from("predictions")
    .select("*")
    .lt("timestamp", cutoff)
    .is("actual", null)
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!predictions?.length) {
    return NextResponse.json({ resolved: 0, message: "No unresolved predictions found" });
  }

  let resolved = 0;
  const errors: string[] = [];

  for (const pred of predictions as Prediction[]) {
    try {
      const predTime = new Date(pred.timestamp).getTime();
      const windowStart = new Date(predTime - 2 * 60 * 60 * 1000).toISOString(); // 2h before
      const windowEnd = new Date(predTime + 28 * 60 * 60 * 1000).toISOString();  // 28h after

      const { data: prices } = await supabase
        .from("prices")
        .select("timestamp, close")
        .eq("stock_id", pred.stock_id)
        .gte("timestamp", windowStart)
        .lte("timestamp", windowEnd)
        .order("timestamp", { ascending: true });

      if (!prices || prices.length < 2) continue;

      const atPrediction = (prices as Price[])[0].close;
      const afterDay = (prices as Price[])[prices.length - 1].close;
      const actual: "up" | "down" = afterDay >= atPrediction ? "up" : "down";

      const { error: updateError } = await supabase
        .from("predictions")
        .update({ actual })
        .eq("id", pred.id);

      if (updateError) {
        errors.push(`${pred.id}: ${updateError.message}`);
      } else {
        resolved++;
      }
    } catch (err) {
      errors.push(`${pred.id}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    resolved,
    errors: errors.length,
    ...(errors.length > 0 && { errorDetails: errors }),
  });
}
