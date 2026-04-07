import Link from "next/link";
import type { StockWithData } from "@/types";
import Sparkline from "./Sparkline";

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

  // Last 30 closes for sparkline
  const sparkPrices = priceHistory.slice(-30).map((p) => p.close);

  return (
    <Link href={`/stock/${stock.ticker.toLowerCase()}`} className="block group">
      <div
        className="card cursor-pointer p-5 hover:bg-[var(--bg-raised)]"
        style={{ background: "var(--bg-card)" }}
      >
        {/* Top row: ticker + prediction badge */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[11px] font-medium text-[var(--text-3)] mb-0.5 tracking-wide">
              {stock.name}
            </p>
            <p className="text-xl font-bold text-white tracking-tight">{stock.ticker}</p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold mt-0.5 ${
              isUp
                ? "bg-[var(--green-dim)] text-[var(--green)]"
                : "bg-[var(--red-dim)] text-[var(--red)]"
            }`}
          >
            {isUp ? "▲" : "▼"} {isUp ? "Buy" : "Sell"}
          </span>
        </div>

        {/* Sparkline */}
        <div className="mb-3 -mx-1">
          <Sparkline prices={sparkPrices} positive={isPositive} height={44} />
        </div>

        {/* Bottom row: price + change */}
        <div className="flex items-end justify-between">
          <div>
            <p className="num text-2xl font-bold text-white leading-none">
              ${latestPrice.close.toFixed(2)}
            </p>
            <p className={`num text-xs mt-1 font-medium ${isPositive ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
              {isPositive ? "+" : ""}{change.toFixed(2)} ({isPositive ? "+" : ""}{changePct.toFixed(2)}%)
            </p>
          </div>
          <div className="text-right">
            <p className="num text-[11px] text-[var(--text-3)]">
              {Math.round(prediction.confidence * 100)}% conf.
            </p>
            <p className="num text-[11px] text-[var(--text-3)] mt-0.5">
              Vol {(latestPrice.volume / 1_000_000).toFixed(1)}M
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
