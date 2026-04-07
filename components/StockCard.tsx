import Link from "next/link";
import type { StockWithData } from "@/types";
import ConfidenceMeter from "./ConfidenceMeter";

interface StockCardProps {
  data: StockWithData;
}

export default function StockCard({ data }: StockCardProps) {
  const { stock, latestPrice, prediction, priceHistory } = data;

  const prevClose = priceHistory[priceHistory.length - 2]?.close ?? latestPrice.open;
  const change = latestPrice.close - prevClose;
  const changePct = (change / prevClose) * 100;
  const isPositive = change >= 0;
  const isUp = prediction.prediction === "up";

  return (
    <Link href={`/stock/${stock.ticker.toLowerCase()}`}>
      <div className="group relative rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900 cursor-pointer">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500">{stock.name}</p>
            <p className="text-2xl font-bold tracking-tight text-white">
              {stock.ticker}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              isUp
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {isUp ? "↑" : "↓"} {isUp ? "BUY" : "SELL"}
          </span>
        </div>

        {/* Price */}
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">
            ${latestPrice.close.toFixed(2)}
          </span>
          <span
            className={`text-sm font-medium ${
              isPositive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isPositive ? "+" : ""}
            {change.toFixed(2)} ({isPositive ? "+" : ""}
            {changePct.toFixed(2)}%)
          </span>
        </div>

        <p className="mb-4 text-xs text-zinc-600">
          Vol: {(latestPrice.volume / 1_000_000).toFixed(1)}M
        </p>

        {/* Confidence */}
        <ConfidenceMeter confidence={prediction.confidence} />
      </div>
    </Link>
  );
}
