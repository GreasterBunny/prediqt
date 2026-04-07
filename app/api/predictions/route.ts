import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getMockStock } from "@/mock/data";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker parameter" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseClient();

    if (!supabase) {
      const mock = getMockStock(ticker);
      if (!mock) {
        return NextResponse.json({ error: "Stock not found" }, { status: 404 });
      }
      return NextResponse.json({
        latest: mock.prediction,
        history: mock.predictionHistory,
      });
    }

    const { data: stock, error: stockError } = await supabase
      .from("stocks")
      .select("id")
      .ilike("ticker", ticker)
      .single();

    if (stockError || !stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const [latestRes, historyRes] = await Promise.all([
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
    ]);

    if (latestRes.error || !latestRes.data) {
      return NextResponse.json({ error: "No predictions found" }, { status: 404 });
    }

    return NextResponse.json({
      latest: latestRes.data,
      history: historyRes.data ?? [],
    });
  } catch (err) {
    console.error("[GET /api/predictions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
