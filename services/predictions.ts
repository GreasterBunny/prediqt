import type { Price } from "@/types";
import { sma, rsi, macd } from "./indicators";

export const MODEL_VERSION = "v1.0";

export interface Signal {
  name: string;
  direction: "up" | "down" | "neutral";
  confidence: number; // 0–1
  reason: string;
  weight: number;
}

export interface PredictionResult {
  prediction: "up" | "down";
  confidence: number;
  signals: Signal[];
  model_version: string;
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

/** Signal 1: Moving Average Crossover (SMA-50 vs SMA-200) */
function maCrossoverSignal(closes: number[]): Signal {
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, Math.min(200, closes.length));
  const gap = (sma50 - sma200) / sma200;
  const isUp = sma50 > sma200;
  const confidence = clamp(0.55 + Math.abs(gap) * 8, 0.55, 0.88);

  return {
    name: "MA Crossover",
    direction: isUp ? "up" : "down",
    confidence,
    reason: isUp
      ? `SMA-50 (${sma50.toFixed(2)}) above SMA-200 (${sma200.toFixed(2)}) — golden cross`
      : `SMA-50 (${sma50.toFixed(2)}) below SMA-200 (${sma200.toFixed(2)}) — death cross`,
    weight: 0.35,
  };
}

/** Signal 2: RSI Threshold */
function rsiSignal(closes: number[]): Signal {
  const rsiVal = rsi(closes);
  let direction: "up" | "down" | "neutral";
  let confidence: number;
  let reason: string;

  if (rsiVal < 30) {
    direction = "up";
    confidence = clamp(0.6 + (30 - rsiVal) / 60, 0.6, 0.88);
    reason = `RSI ${rsiVal.toFixed(1)} — oversold, likely reversal upward`;
  } else if (rsiVal > 70) {
    direction = "down";
    confidence = clamp(0.6 + (rsiVal - 70) / 60, 0.6, 0.88);
    reason = `RSI ${rsiVal.toFixed(1)} — overbought, likely reversal downward`;
  } else if (rsiVal < 45) {
    direction = "down";
    confidence = 0.55;
    reason = `RSI ${rsiVal.toFixed(1)} — below neutral, mild bearish pressure`;
  } else if (rsiVal > 55) {
    direction = "up";
    confidence = 0.55;
    reason = `RSI ${rsiVal.toFixed(1)} — above neutral, mild bullish momentum`;
  } else {
    direction = "neutral";
    confidence = 0.5;
    reason = `RSI ${rsiVal.toFixed(1)} — neutral zone, no strong signal`;
  }

  return { name: "RSI", direction, confidence, reason, weight: 0.30 };
}

/** Signal 3: MACD */
function macdSignal(closes: number[]): Signal {
  const { macd: macdVal, histogram } = macd(closes);
  const lastClose = closes[closes.length - 1];
  const isUp = macdVal > 0;
  const strength = Math.abs(macdVal) / lastClose;
  const confidence = clamp(0.52 + strength * 50, 0.52, 0.85);

  return {
    name: "MACD",
    direction: isUp ? "up" : "down",
    confidence,
    reason: isUp
      ? `MACD ${macdVal.toFixed(3)} positive${histogram > 0 ? ", histogram expanding" : ", histogram contracting"}`
      : `MACD ${macdVal.toFixed(3)} negative${histogram < 0 ? ", histogram expanding" : ", histogram contracting"}`,
    weight: 0.25,
  };
}

/** Signal 4: Price Momentum (5-day vs 15-day) */
function momentumSignal(closes: number[]): Signal {
  if (closes.length < 15) {
    return { name: "Momentum", direction: "neutral", confidence: 0.5, reason: "Insufficient data", weight: 0.10 };
  }

  const recent = closes[closes.length - 1];
  const fiveDaysAgo = closes[closes.length - 6];
  const change = (recent - fiveDaysAgo) / fiveDaysAgo;
  const isUp = change > 0;
  const confidence = clamp(0.52 + Math.abs(change) * 5, 0.52, 0.82);

  return {
    name: "Momentum",
    direction: isUp ? "up" : "down",
    confidence,
    reason: isUp
      ? `+${(change * 100).toFixed(2)}% over 5 days — upward momentum`
      : `${(change * 100).toFixed(2)}% over 5 days — downward momentum`,
    weight: 0.10,
  };
}

/**
 * Run the full prediction engine on a price history array.
 * Returns direction, confidence, and per-signal breakdown.
 */
export function runPrediction(prices: Price[]): PredictionResult {
  const closes = prices.map((p) => p.close);

  const signals: Signal[] = [
    maCrossoverSignal(closes),
    rsiSignal(closes),
    macdSignal(closes),
    momentumSignal(closes),
  ];

  // Weighted vote
  let upScore = 0;
  let downScore = 0;

  for (const signal of signals) {
    if (signal.direction === "up") {
      upScore += signal.weight * signal.confidence;
    } else if (signal.direction === "down") {
      downScore += signal.weight * signal.confidence;
    } else {
      // Neutral: split evenly
      upScore += signal.weight * 0.5;
      downScore += signal.weight * 0.5;
    }
  }

  const total = upScore + downScore;
  const prediction: "up" | "down" = upScore >= downScore ? "up" : "down";
  const rawConfidence = Math.max(upScore, downScore) / total;
  // Scale from [0.5, 1.0] → [0.52, 0.92]
  const confidence = parseFloat((0.52 + (rawConfidence - 0.5) * 0.8).toFixed(2));

  return { prediction, confidence, signals, model_version: MODEL_VERSION };
}
