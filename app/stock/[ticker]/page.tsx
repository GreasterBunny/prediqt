import { notFound } from "next/navigation";
import { getStockByTicker } from "@/services/stocks";
import { runPrediction } from "@/services/predictions";
import { computeAccuracy } from "@/services/accuracy";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import Header from "@/components/Header";
import PredictionCard from "@/components/PredictionCard";
import PredictionSignals from "@/components/PredictionSignals";
import IndicatorPanel from "@/components/IndicatorPanel";
import PredictionHistoryTable from "@/components/PredictionHistoryTable";
import AccuracyStats from "@/components/AccuracyStats";
import AccuracyChart from "@/components/AccuracyChart";
import ChartComponent from "@/components/ChartComponent";
import SentimentCard from "@/components/SentimentCard";
import ModelComparison from "@/components/ModelComparison";
import { runPredictionV2 } from "@/services/predictions-v2";

interface StockPageProps {
  params: Promise<{ ticker: string }>;
}

export const revalidate = 60;

export default async function StockPage({ params }: StockPageProps) {
  const { ticker } = await params;
  const data = await getStockByTicker(ticker);
  if (!data) notFound();

  const { stock, latestPrice, prediction, indicators, priceHistory, predictionHistory } = data;
  const engineResult = runPrediction(priceHistory);
  const engineResultV2 = runPredictionV2(priceHistory);
  const accuracy = computeAccuracy(predictionHistory);

  const prevClose = priceHistory[priceHistory.length - 2]?.close ?? latestPrice.open;
  const change = latestPrice.close - prevClose;
  const changePct = (change / prevClose) * 100;
  const isPositive = change >= 0;
  const isLive = isSupabaseConfigured();

  return (
    <div className="min-h-screen px-6 py-2" style={{ background: "var(--bg-base)" }}>
      <div className="mx-auto max-w-5xl">
        <Header isLive={isLive} backHref="/dashboard" backLabel="Dashboard" />

        <main className="pt-6 pb-16 space-y-3">
          {/* Hero */}
          <div className="flex flex-wrap items-end justify-between gap-4 py-5">
            <div>
              <p className="text-sm text-[var(--text-2)] mb-1">{stock.name}</p>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tight text-white">
                  {stock.ticker}
                </h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isPositive
                      ? "bg-[var(--green-dim)] text-[var(--green)]"
                      : "bg-[var(--red-dim)] text-[var(--red)]"
                  }`}
                >
                  {isPositive ? "+" : ""}{changePct.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="num text-4xl font-bold text-white">${latestPrice.close.toFixed(2)}</p>
              <p className={`num text-sm mt-1 font-medium ${isPositive ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                {isPositive ? "+" : ""}{change.toFixed(2)} today
              </p>
            </div>
          </div>

          {/* Price chart */}
          <ChartComponent prices={priceHistory} ticker={stock.ticker} />

          {/* Prediction + Indicators */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <PredictionCard prediction={{ ...prediction, ...engineResult }} />
            <IndicatorPanel indicators={indicators} currentPrice={latestPrice.close} />
          </div>

          {/* Signal breakdown */}
          <PredictionSignals signals={engineResult.signals} />

          {/* Model Comparison */}
          <ModelComparison v1={engineResult} v2={engineResultV2} />

          {/* News Sentiment */}
          <SentimentCard ticker={stock.ticker} />

          {/* Accuracy */}
          <AccuracyStats metrics={accuracy} />
          <AccuracyChart data={accuracy.dailyAccuracy} />

          {/* OHLCV */}
          <div className="card p-5" style={{ background: "var(--bg-card)" }}>
            <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide mb-4">
              Today&apos;s Session
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Open",   value: `$${latestPrice.open.toFixed(2)}` },
                { label: "High",   value: `$${latestPrice.high.toFixed(2)}` },
                { label: "Low",    value: `$${latestPrice.low.toFixed(2)}`  },
                { label: "Volume", value: `${(latestPrice.volume / 1_000_000).toFixed(1)}M` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl p-3" style={{ background: "var(--bg-raised)" }}>
                  <p className="text-[11px] text-[var(--text-3)]">{label}</p>
                  <p className="num mt-1 text-sm font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          <PredictionHistoryTable history={predictionHistory} />

          <p className="pt-4 text-center text-xs text-[var(--text-3)]">
            Prediqt · AI predictions are not financial advice
          </p>
        </main>
      </div>
    </div>
  );
}
