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
      return NextResponse.json(mock.priceHistory);
    }

    const { data: stock, error: stockError } = await supabase
      .from("stocks")
      .select("id")
      .ilike("ticker", ticker)
      .single();

    if (stockError || !stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const { data: prices, error } = await supabase
      .from("prices")
      .select("*")
      .eq("stock_id", stock.id)
      .order("timestamp", { ascending: true })
      .limit(60);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
    }

    return NextResponse.json(prices ?? []);
  } catch (err) {
    console.error("[GET /api/prices]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
