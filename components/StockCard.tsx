import Link from "next/link";
import type { StockWithData } from "@/types";
import Sparkline from "./Sparkline";
import { IconTriangleUp, IconTriangleDown, IconLightning, IconWarning } from "./Icons";

export interface AlignmentStatus {
  aligned: boolean;
  direction: "up" | "down";
  v1Confidence: number;
  v2Confidence: number;
  avgConfidence: number;
}

interface StockCardProps {
  data: StockWithData;
  alignment?: AlignmentStatus;
}

export default function StockCard({ data, alignment }: StockCardProps) {
  const { stock, latestPrice, prediction, priceHistory } = data;

  const prevClose = priceHistory[priceHistory.length - 2]?.close ?? latestPrice.open;
  const change = latestPrice.close - prevClose;
  const changePct = (change / prevClose) * 100;
  const isPositive = change >= 0;
  const isUp = prediction.prediction === "up";

  const sparkPrices = priceHistory.slice(-30).map((p) => p.close);
  const isAligned = alignment?.aligned ?? false;
  const alignUp = alignment?.direction === "up";

  return (
    <Link href={`/stock/${stock.ticker.toLowerCase()}`} className="block group">
      <div
        className="card cursor-pointer p-5 hover:bg-[var(--bg-raised)] relative overflow-hidden"
        style={{
          background: "var(--bg-card)",
          borderLeft: isAligned
            ? "2px solid var(--green)"
            : undefined,
        }}
      >
        {/* Alignment banner — gold when both models agree */}
        {isAligned && (
          <div
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 mb-3 text-[10px] font-semibold"
            style={{ background: "var(--green-dim)", color: "var(--green)" }}
          >
            <IconLightning size={11} />
            <span>Both models {alignUp ? "bullish" : "bearish"}</span>
            <span
              className="ml-auto num rounded-full px-1.5 py-0.5 text-[9px]"
              style={{ background: "rgba(34,197,94,0.20)", color: "var(--green)" }}
            >
              {Math.round((alignment?.avgConfidence ?? 0) * 100)}% avg
            </span>
          </div>
        )}

        {/* Top row */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[11px] font-medium text-[var(--text-3)] mb-0.5 tracking-wide">
              {stock.name}
            </p>
            <p className="text-xl font-bold text-white tracking-tight">{stock.ticker}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 mt-0.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isUp
                  ? "bg-[var(--green-dim)] text-[var(--green)]"
                  : "bg-[var(--red-dim)] text-[var(--red)]"
              }`}
            >
              {isUp ? <IconTriangleUp size={8} /> : <IconTriangleDown size={8} />}
              {isUp ? "Buy" : "Sell"}
            </span>
            {!isAligned && alignment && (
              <span
                className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--bg-raised)", color: "var(--text-3)" }}
              >
                <IconWarning size={9} />
                Mixed signals
              </span>
            )}
          </div>
        </div>

        {/* Sparkline */}
        <div className="mb-3 -mx-1">
          <Sparkline prices={sparkPrices} positive={isPositive} height={44} />
        </div>

        {/* Bottom row */}
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
