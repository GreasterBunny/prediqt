import { NextResponse } from "next/server";
import { getAllStocks } from "@/services/stocks";

export async function GET() {
  try {
    const stocks = await getAllStocks();
    return NextResponse.json(
      stocks.map(({ stock, latestPrice, prediction }) => ({
        id: stock.id,
        ticker: stock.ticker,
        name: stock.name,
        price: latestPrice.close,
        prediction: prediction.prediction,
        confidence: prediction.confidence,
      }))
    );
  } catch (err) {
    console.error("[GET /api/stocks]", err);
    return NextResponse.json({ error: "Failed to fetch stocks" }, { status: 500 });
  }
}
