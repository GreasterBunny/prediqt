import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getStockByTicker } from "@/services/stocks";
import { runBacktest } from "@/services/backtesting";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();

  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
  }

  try {
    const stockData = await getStockByTicker(ticker);
    if (!stockData) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const { priceHistory } = stockData;
    if (priceHistory.length < 35) {
      return NextResponse.json(
        { error: "Insufficient price history for backtesting (need 35+ days)" },
        { status: 422 }
      );
    }

    const result = runBacktest(priceHistory, ticker);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[backtest]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
