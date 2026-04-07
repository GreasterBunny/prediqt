import type { Indicators } from "@/types";

interface IndicatorPanelProps {
  indicators: Indicators;
  currentPrice: number;
}

function signal(condition: "up" | "down" | "neutral") {
  const map = {
    up:      { label: "Bullish", color: "text-[var(--green)]", bg: "bg-[var(--green-dim)]" },
    down:    { label: "Bearish", color: "text-[var(--red)]",   bg: "bg-[var(--red-dim)]"   },
    neutral: { label: "Neutral", color: "text-[var(--text-2)]", bg: "bg-[var(--bg-raised)]" },
  };
  return map[condition];
}

interface RowProps {
  name: string;
  value: string;
  direction: "up" | "down" | "neutral";
}

function Row({ name, value, direction }: RowProps) {
  const sig = signal(direction);
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
      <span className="text-sm text-[var(--text-2)]">{name}</span>
      <div className="flex items-center gap-2.5">
        <span className="num text-sm font-medium text-white">{value}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sig.bg} ${sig.color}`}>
          {sig.label}
        </span>
      </div>
    </div>
  );
}

export default function IndicatorPanel({ indicators, currentPrice }: IndicatorPanelProps) {
  const rsiDir = indicators.rsi >= 70 ? "down" : indicators.rsi <= 30 ? "up" : "neutral";
  const macdDir = indicators.macd > 0 ? "up" : "down";
  const sma50Dir = currentPrice > indicators.sma_50 ? "up" : "down";
  const sma200Dir = currentPrice > indicators.sma_200 ? "up" : "down";

  return (
    <div className="card p-5" style={{ background: "var(--bg-card)" }}>
      <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide mb-1">
        Technical Indicators
      </p>
      <Row name="RSI (14)" value={indicators.rsi.toFixed(1)} direction={rsiDir} />
      <Row name="MACD" value={indicators.macd.toFixed(3)} direction={macdDir} />
      <Row name="SMA 50" value={`$${indicators.sma_50.toFixed(2)}`} direction={sma50Dir} />
      <Row name="SMA 200" value={`$${indicators.sma_200.toFixed(2)}`} direction={sma200Dir} />
    </div>
  );
}
