import type { Indicators } from "@/types";

interface IndicatorPanelProps {
  indicators: Indicators;
  currentPrice: number;
}

function rsiLabel(rsi: number) {
  if (rsi >= 70) return { label: "Overbought", color: "text-red-400" };
  if (rsi <= 30) return { label: "Oversold", color: "text-emerald-400" };
  return { label: "Neutral", color: "text-zinc-400" };
}

function macdLabel(macd: number) {
  if (macd > 0) return { label: "Bullish", color: "text-emerald-400" };
  return { label: "Bearish", color: "text-red-400" };
}

function smaLabel(price: number, sma: number) {
  if (price > sma) return { label: "Above", color: "text-emerald-400" };
  return { label: "Below", color: "text-red-400" };
}

interface IndicatorRowProps {
  label: string;
  value: string;
  signal: string;
  signalColor: string;
}

function IndicatorRow({ label, value, signal, signalColor }: IndicatorRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
      <span className="text-sm text-zinc-400">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-white">{value}</span>
        <span className={`text-xs font-medium ${signalColor}`}>{signal}</span>
      </div>
    </div>
  );
}

export default function IndicatorPanel({ indicators, currentPrice }: IndicatorPanelProps) {
  const rsi = rsiLabel(indicators.rsi);
  const macd = macdLabel(indicators.macd);
  const sma50 = smaLabel(currentPrice, indicators.sma_50);
  const sma200 = smaLabel(currentPrice, indicators.sma_200);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-sm">
      <p className="mb-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
        Technical Indicators
      </p>

      <IndicatorRow
        label="RSI (14)"
        value={indicators.rsi.toFixed(1)}
        signal={rsi.label}
        signalColor={rsi.color}
      />
      <IndicatorRow
        label="MACD"
        value={indicators.macd.toFixed(2)}
        signal={macd.label}
        signalColor={macd.color}
      />
      <IndicatorRow
        label="SMA 50"
        value={`$${indicators.sma_50.toFixed(2)}`}
        signal={sma50.label}
        signalColor={sma50.color}
      />
      <IndicatorRow
        label="SMA 200"
        value={`$${indicators.sma_200.toFixed(2)}`}
        signal={sma200.label}
        signalColor={sma200.color}
      />
    </div>
  );
}
