import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { analyzeSentiment } from "@/services/sentiment";
import { getSupabaseClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();

  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
  }

  try {
    // Check Supabase cache first (today's analysis)
    const supabase = getSupabaseClient();
    if (supabase) {
      const today = new Date().toISOString().split("T")[0];
      const { data: cached } = await supabase
        .from("news_sentiment")
        .select("*")
        .eq("ticker", ticker)
        .gte("analyzed_at", today)
        .order("analyzed_at", { ascending: false })
        .limit(1)
        .single();

      if (cached) {
        return NextResponse.json({
          ticker: cached.ticker,
          sentimentScore: cached.sentiment_score,
          sentimentLabel: cached.sentiment_label,
          headlineCount: cached.headline_count,
          summary: cached.summary,
          headlines: [],
          analyzedAt: cached.analyzed_at,
          source: "cache",
        });
      }
    }

    // Run fresh analysis
    const result = await analyzeSentiment(ticker);

    // Persist to Supabase
    if (supabase) {
      const { data: stock } = await supabase
        .from("stocks")
        .select("id")
        .eq("ticker", ticker)
        .single();

      if (stock) {
        await supabase.from("news_sentiment").insert({
          stock_id: stock.id,
          ticker: result.ticker,
          sentiment_score: result.sentimentScore,
          sentiment_label: result.sentimentLabel,
          headline_count: result.headlineCount,
          summary: result.summary,
        });
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[fetch-sentiment]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
