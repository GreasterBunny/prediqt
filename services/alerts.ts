/**
 * Phase 13 — Alerts & Notifications
 * CRUD operations for the alerts table.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type AlertType = "prediction_flip" | "high_confidence" | "trade_closed" | "system";

export interface Alert {
  id: string;
  stock_id: string | null;
  ticker: string | null;
  type: AlertType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export async function getAlerts(supabase: SupabaseClient, limit = 50): Promise<Alert[]> {
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[alerts] getAlerts error:", error.message);
    return [];
  }
  return (data ?? []) as Alert[];
}

export async function getUnreadCount(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) return 0;
  return count ?? 0;
}

export async function createAlert(
  supabase: SupabaseClient,
  alert: Omit<Alert, "id" | "is_read" | "created_at">
): Promise<Alert | null> {
  const { data, error } = await supabase
    .from("alerts")
    .insert({ ...alert, is_read: false })
    .select()
    .single();

  if (error) {
    console.error("[alerts] createAlert error:", error.message);
    return null;
  }
  return data as Alert;
}

export async function markAlertRead(supabase: SupabaseClient, id: string): Promise<void> {
  await supabase.from("alerts").update({ is_read: true }).eq("id", id);
}

export async function markAllRead(supabase: SupabaseClient): Promise<void> {
  await supabase.from("alerts").update({ is_read: true }).eq("is_read", false);
}

/** Seed an alert when a prediction flips direction for a given stock */
export async function maybeCreatePredictionFlipAlert(
  supabase: SupabaseClient,
  ticker: string,
  stockId: string,
  newDirection: "up" | "down",
  confidence: number
): Promise<void> {
  // Get most recent prediction for comparison
  const { data: prev } = await supabase
    .from("predictions")
    .select("prediction")
    .eq("stock_id", stockId)
    .order("timestamp", { ascending: false })
    .limit(2);

  const prevPredictions = (prev ?? []) as { prediction: string }[];
  if (prevPredictions.length < 2) return;

  const lastPrediction = prevPredictions[1]?.prediction;
  if (!lastPrediction || lastPrediction === newDirection) return;

  await createAlert(supabase, {
    stock_id: stockId,
    ticker,
    type: "prediction_flip",
    title: `${ticker} signal flipped ${newDirection === "up" ? "bullish ↑" : "bearish ↓"}`,
    message: `Prediction changed from ${lastPrediction} to ${newDirection} with ${Math.round(confidence * 100)}% confidence.`,
  });
}

/** Create a high-confidence alert */
export async function maybeCreateHighConfidenceAlert(
  supabase: SupabaseClient,
  ticker: string,
  stockId: string,
  direction: "up" | "down",
  confidence: number,
  threshold = 0.8
): Promise<void> {
  if (confidence < threshold) return;

  // Don't spam — only one high-confidence alert per stock per day
  const today = new Date().toISOString().split("T")[0];
  const { count } = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("stock_id", stockId)
    .eq("type", "high_confidence")
    .gte("created_at", today);

  if ((count ?? 0) > 0) return;

  await createAlert(supabase, {
    stock_id: stockId,
    ticker,
    type: "high_confidence",
    title: `${ticker} — High confidence ${direction === "up" ? "buy ↑" : "sell ↓"} signal`,
    message: `Model predicts ${direction} with ${Math.round(confidence * 100)}% confidence — above the 80% alert threshold.`,
  });
}
