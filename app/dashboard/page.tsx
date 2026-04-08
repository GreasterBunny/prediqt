import { getAllStocks } from "@/services/stocks";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabaseClient";
import { runPrediction } from "@/services/predictions";
import { runPredictionV2 } from "@/services/predictions-v2";
import { detectDataSource } from "@/services/market-data";
import StockCard from "@/components/StockCard";
import type { AlignmentStatus } from "@/components/StockCard";
import Header from "@/components/Header";
import Link from "next/link";

export const revalidate = 60;

export default async function DashboardPage() {
  const stocks = await getAllStocks();
  const isLive = isSupabaseConfigured();
  const dataSource = detectDataSource();

  // Check data freshness — get most recent price date across all stocks
  let latestPriceDate: string | null = null;
  let usingMockData = true;
  if (isLive) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("prices")
        .select("timestamp")
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();
      if (data?.timestamp) {
        latestPriceDate = (data.timestamp as string).split("T")[0];
        usingMockData = false;
      }
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
  const dayOfWeek = new Date().getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isStale = !usingMockData && latestPriceDate !== null &&
    latestPriceDate < yesterday && !isWeekend;

  // Compute both model predictions + alignment for each stock
  const stocksWithAlignment = stocks.map((data) => {
    const v1 = runPrediction(data.priceHistory);
    const v2 = runPredictionV2(data.priceHistory);
    const aligned = v1.prediction === v2.prediction;
    const alignment: AlignmentStatus = {
      aligned,
      direction: v1.prediction,
      v1Confidence: v1.confidence,
      v2Confidence: v2.confidence,
      avgConfidence: (v1.confidence + v2.confidence) / 2,
    };
    return { data, alignment, v1, v2 };
  });

  // Summary stats
  const bullish = stocksWithAlignment.filter((s) => s.v1.prediction === "up").length;
  const bearish = stocks.length - bullish;
  const avgConf = stocks.length
    ? Math.round((stocks.reduce((a, s) => a + s.prediction.confidence, 0) / stocks.length) * 100)
    : 0;

  const alignedBullish = stocksWithAlignment.filter(
    (s) => s.alignment.aligned && s.alignment.direction === "up"
  ).length;
  const alignedBearish = stocksWithAlignment.filter(
    (s) => s.alignment.aligned && s.alignment.direction === "down"
  ).length;
  const mixed = stocks.length - alignedBullish - alignedBearish;

  // Sort: aligned first (strongest avg confidence), then mixed
  const sorted = [...stocksWithAlignment].sort((a, b) => {
    if (a.alignment.aligned && !b.alignment.aligned) return -1;
    if (!a.alignment.aligned && b.alignment.aligned) return 1;
    return b.alignment.avgConfidence - a.alignment.avgConfidence;
  });

  return (
    <div className="min-h-screen px-6 py-2" style={{ background: "var(--bg-base)" }}>
      <div className="mx-auto max-w-7xl">
        <Header isLive={isLive} />

        <main className="pt-8 pb-16">

          {/* Data source / freshness banner */}
          {isLive && (
            <div className="mb-6">
              {usingMockData ? (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs"
                  style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--red)]">⚠</span>
                    <span className="font-semibold text-white">Running on mock data</span>
                    <span className="text-[var(--text-3)]">— No real price data in database yet.</span>
                  </div>
                  <Link
                    href="/pipeline"
                    className="font-semibold px-3 py-1 rounded-full transition-colors"
                    style={{ background: "rgba(239,68,68,0.12)", color: "var(--red)" }}
                  >
                    Backfill real data →
                  </Link>
                </div>
              ) : isStale ? (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs"
                  style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--red)]">⚠</span>
                    <span className="font-semibold text-white">Price data is stale</span>
                    <span className="num text-[var(--text-3)]">Last update: {latestPriceDate}</span>
                  </div>
                  <Link
                    href="/pipeline"
                    className="font-semibold px-3 py-1 rounded-full transition-colors"
                    style={{ background: "rgba(239,68,68,0.12)", color: "var(--red)" }}
                  >
                    Refresh data →
                  </Link>
                </div>
              ) : (
                <div
                  className="flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-xs"
                  style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.12)" }}
                >
                  <span className="text-[var(--green)]">●</span>
                  <span className="font-semibold text-white">Live data</span>
                  <span className="text-[var(--text-3)]">
                    via {dataSource === "polygon" ? "Polygon.io" : "Yahoo Finance"}
                    {latestPriceDate && ` · Last close ${latestPriceDate}`}
                  </span>
                  <span className="text-[var(--text-3)]">·</span>
                  <span className="text-[var(--text-3)]">Cron runs weekdays at 4 PM ET</span>
                  <Link
                    href="/pipeline"
                    className="ml-auto text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                  >
                    Pipeline →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Page title + date */}
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Markets</h1>
              <p className="text-sm text-[var(--text-2)] mt-0.5">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          {/* Alignment legend */}
          <div
            className="rounded-2xl p-4 mb-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <p className="text-xs font-semibold text-white">Model Alignment Overview</p>
              <p className="text-[10px] text-[var(--text-3)]">
                ⚡ means both the Technical (v1.0) and Momentum (v2.0) models point the same way — a stronger signal
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Aligned bullish */}
              <div
                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ background: "rgba(34,197,94,0.10)", color: "var(--green)" }}
              >
                <span>⚡</span>
                <span className="num">{alignedBullish}</span>
                <span>aligned bullish</span>
              </div>

              {/* Aligned bearish */}
              <div
                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ background: "rgba(239,68,68,0.10)", color: "var(--red)" }}
              >
                <span>⚡</span>
                <span className="num">{alignedBearish}</span>
                <span>aligned bearish</span>
              </div>

              {/* Mixed signals */}
              <div
                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
                style={{ background: "var(--bg-raised)", color: "var(--text-2)" }}
              >
                <span>⚠</span>
                <span className="num">{mixed}</span>
                <span>mixed signals</span>
              </div>

              {/* Divider */}
              <div className="w-px self-stretch" style={{ background: "var(--border)" }} />

              {/* Classic v1 summary */}
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                style={{ background: "var(--bg-raised)", color: "var(--text-2)" }}
              >
                <span className="text-[var(--green)]">▲</span>
                <span className="num">{bullish}</span>
                <span className="text-[var(--text-3)]">/</span>
                <span className="text-[var(--red)]">▼</span>
                <span className="num">{bearish}</span>
                <span className="text-[var(--text-3)]">·</span>
                <span className="num">{avgConf}% avg</span>
              </div>
            </div>
          </div>

          {/* Stock grid — aligned first */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map(({ data, alignment }) => (
              <StockCard key={data.stock.id} data={data} alignment={alignment} />
            ))}
          </div>

          <p className="mt-12 text-center text-xs text-[var(--text-3)]">
            Prediqt · ⚡ Aligned = both Technical & Momentum models agree · Not financial advice
          </p>
        </main>
      </div>
    </div>
  );
}
