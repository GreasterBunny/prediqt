import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getMockStock } from "@/mock/data";
import { runPrediction } from "@/services/predictions";
import type { Price } from "@/types";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker parameter" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseClient();

    if (!supabase) {
      const mock = getMockStock(ticker);
      if (!mock) return NextResponse.json({ error: "Stock not found" }, { status: 404 });
      const result = runPrediction(mock.priceHistory);
      return NextResponse.json({ latest: { ...mock.prediction, ...result }, history: mock.predictionHistory });
    }

    const { data: stock, error: stockError } = await supabase
      .from("stocks")
      .select("id")
      .ilike("ticker", ticker)
      .single();

    if (stockError || !stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const [latestRes, historyRes, pricesRes] = await Promise.all([
      supabase
        .from("predictions")
        .select("*")
        .eq("stock_id", stock.id)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single(),

      supabase
        .from("predictions")
        .select("*")
        .eq("stock_id", stock.id)
        .order("timestamp", { ascending: false })
        .limit(30),

      supabase
        .from("prices")
        .select("*")
        .eq("stock_id", stock.id)
        .order("timestamp", { ascending: true })
        .limit(200),
    ]);

    // Run engine on-the-fly if no stored prediction but we have price data
    if ((latestRes.error || !latestRes.data) && pricesRes.data?.length) {
      const result = runPrediction(pricesRes.data as Price[]);
      return NextResponse.json({
        latest: {
          id: "live",
          stock_id: stock.id,
          timestamp: new Date().toISOString(),
          ...result,
        },
        history: historyRes.data ?? [],
        live: true,
      });
    }

    if (!latestRes.data) {
      return NextResponse.json({ error: "No predictions found" }, { status: 404 });
    }

    // Attach live signals to stored prediction
    let signals = undefined;
    if (pricesRes.data?.length) {
      const result = runPrediction(pricesRes.data as Price[]);
      signals = result.signals;
    }

    return NextResponse.json({
      latest: { ...latestRes.data, signals },
      history: historyRes.data ?? [],
    });
  } catch (err) {
    console.error("[GET /api/predictions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
