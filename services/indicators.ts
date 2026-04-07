import type { Price } from "@/types";

/** Simple Moving Average */
export function sma(closes: number[], period: number): number {
  const slice = closes.slice(-period);
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/** Exponential Moving Average */
export function ema(closes: number[], period: number): number {
  if (closes.length < period) return sma(closes, closes.length);
  const k = 2 / (period + 1);
  let value = sma(closes.slice(0, period), period);
  for (let i = period; i < closes.length; i++) {
    value = closes[i] * k + value * (1 - k);
  }
  return value;
}

/** RSI (Wilder's smoothing, default 14 periods) */
export function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;

  const changes = closes.slice(1).map((c, i) => c - closes[i]);

  let avgGain =
    changes.slice(0, period).filter((c) => c > 0).reduce((a, b) => a + b, 0) / period;
  let avgLoss =
    changes.slice(0, period).filter((c) => c < 0).reduce((a, b) => a + Math.abs(b), 0) /
    period;

  for (let i = period; i < changes.length; i++) {
    const gain = Math.max(changes[i], 0);
    const loss = Math.abs(Math.min(changes[i], 0));
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
}

/** MACD (12, 26, 9) */
export function macd(closes: number[]): MACDResult {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12 - ema26;

  // Build MACD series for signal line EMA9
  const macdSeries: number[] = [];
  for (let i = 26; i <= closes.length; i++) {
    const e12 = ema(closes.slice(0, i), 12);
    const e26 = ema(closes.slice(0, i), 26);
    macdSeries.push(e12 - e26);
  }

  const signalLine = macdSeries.length >= 9 ? ema(macdSeries, 9) : macdLine;

  return {
    macd: parseFloat(macdLine.toFixed(4)),
    signal: parseFloat(signalLine.toFixed(4)),
    histogram: parseFloat((macdLine - signalLine).toFixed(4)),
  };
}

/** Compute all indicators from price history */
export function computeIndicators(prices: Price[]) {
  const closes = prices.map((p) => p.close);
  return {
    rsi: parseFloat(rsi(closes).toFixed(2)),
    macd: parseFloat(macd(closes).macd.toFixed(4)),
    sma_50: parseFloat(sma(closes, 50).toFixed(2)),
    sma_200: parseFloat(sma(closes, 200).toFixed(2)),
  };
}
