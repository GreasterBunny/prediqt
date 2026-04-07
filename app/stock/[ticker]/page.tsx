import { notFound } from "next/navigation";
import { getStockByTicker } from "@/services/stocks";
import Header from "@/components/Header";
import PredictionCard from "@/components/PredictionCard";
import IndicatorPanel from "@/components/IndicatorPanel";
import PredictionHistoryTable from "@/components/PredictionHistoryTable";
import ChartComponent from "@/components/ChartComponent";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

interface StockPageProps {
  params: Promise<{ ticker: string }>;
}

export const revalidate = 60;

export default async function StockPage({ params }: StockPageProps) {
  const { ticker } = await params;
  const data = await getStockByTicker(ticker);

  if (!data) notFound();

  const { stock, latestPrice, prediction, indicators, priceHistory, predictionHistory } = data;

  const prevClose = priceHistory[priceHistory.length - 2]?.close ?? latestPrice.open;
  const change = latestPrice.close - prevClose;
  const changePct = (change / prevClose) * 100;
  const isPositive = change >= 0;
  const isLive = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-2">
      <Header isLive={isLive} backHref="/dashboard" backLabel="Dashboard" />

      <main className="mx-auto max-w-5xl pt-6 space-y-4">
        {/* Stock hero */}
        <div className="flex flex-wrap items-start justify-between gap-4 py-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                {stock.ticker}
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isPositive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {isPositive ? "+" : ""}
                {changePct.toFixed(2)}%
              </span>
            </div>
            <p className="mt-0.5 text-zinc-500">{stock.name}</p>
          </div>

          <div className="text-right">
            <p className="text-3xl font-bold text-white">
              ${latestPrice.close.toFixed(2)}
            </p>
            <p className={`text-sm ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
              {isPositive ? "+" : ""}
              {change.toFixed(2)} today
            </p>
          </div>
        </div>

        {/* Chart */}
        <ChartComponent prices={priceHistory} ticker={stock.ticker} />

        {/* Prediction + Indicators */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PredictionCard prediction={prediction} />
          <IndicatorPanel indicators={indicators} currentPrice={latestPrice.close} />
        </div>

        {/* OHLCV */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-sm">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
            Today&apos;s Session
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Open", value: `$${latestPrice.open.toFixed(2)}` },
              { label: "High", value: `$${latestPrice.high.toFixed(2)}` },
              { label: "Low", value: `$${latestPrice.low.toFixed(2)}` },
              { label: "Volume", value: `${(latestPrice.volume / 1_000_000).toFixed(1)}M` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-zinc-800/50 p-3">
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="mt-0.5 text-sm font-medium text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Prediction history */}
        <PredictionHistoryTable history={predictionHistory} />

        <p className="pb-4 text-center text-xs text-zinc-700">
          Prediqt · AI predictions are not financial advice
        </p>
      </main>
    </div>
  );
}
