/**
 * Phase 12 — Model v2.0 (Momentum & Volatility Engine)
 * A second prediction model with a different signal architecture:
 *   - Rate of Change (30%)
 *   - Volatility Breakout (25%)
 *   - Volume-weighted Momentum (25%)
 *   - Trend Strength / ADX proxy (20%)
 */

import type { Price } from "@/types";
import type { Signal, PredictionResult } from "./predictions";

export const MODEL_VERSION_2 = "v2.0";

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

/** Signal 1: Rate of Change — 10-day vs 20-day */
function rocSignal(closes: number[]): Signal {
  if (closes.length < 21) {
    return { name: "Rate of Change", direction: "neutral", confidence: 0.5, reason: "Insufficient data", weight: 0.30 };
  }
  const roc10 = (closes[closes.length - 1] - closes[closes.length - 11]) / closes[closes.length - 11];
  const roc20 = (closes[closes.length - 1] - closes[closes.length - 21]) / closes[closes.length - 21];
  const combined = roc10 * 0.6 + roc20 * 0.4;
  const isUp = combined > 0;
  const confidence = clamp(0.52 + Math.abs(combined) * 6, 0.52, 0.88);

  return {
    name: "Rate of Change",
    direction: isUp ? "up" : "down",
    confidence,
    reason: isUp
      ? `ROC-10: +${(roc10 * 100).toFixed(2)}%, ROC-20: +${(roc20 * 100).toFixed(2)}% — accelerating upward`
      : `ROC-10: ${(roc10 * 100).toFixed(2)}%, ROC-20: ${(roc20 * 100).toFixed(2)}% — decelerating`,
    weight: 0.30,
  };
}

/** Signal 2: Volatility Breakout (Bollinger Band position) */
function volatilityBreakoutSignal(closes: number[]): Signal {
  const period = Math.min(20, closes.length);
  const slice = closes.slice(-period);
  const mean = slice.reduce((s, v) => s + v, 0) / period;
  const variance = slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  const current = closes[closes.length - 1];
  const upper = mean + 2 * stdDev;
  const lower = mean - 2 * stdDev;

  // Z-score: how many std devs from mean
  const z = stdDev > 0 ? (current - mean) / stdDev : 0;

  let direction: "up" | "down" | "neutral";
  let confidence: number;
  let reason: string;

  if (current > upper) {
    direction = "down"; // Overbought — mean reversion
    confidence = clamp(0.55 + (current - upper) / stdDev * 0.05, 0.55, 0.85);
    reason = `Price above upper Bollinger Band ($${upper.toFixed(2)}) — overbought, reversion expected`;
  } else if (current < lower) {
    direction = "up"; // Oversold — mean reversion
    confidence = clamp(0.55 + (lower - current) / stdDev * 0.05, 0.55, 0.85);
    reason = `Price below lower Bollinger Band ($${lower.toFixed(2)}) — oversold, bounce expected`;
  } else if (z > 0.5) {
    direction = "up";
    confidence = 0.55;
    reason = `Price in upper half of Bollinger Bands (z=${z.toFixed(2)}) — moderate bullish bias`;
  } else if (z < -0.5) {
    direction = "down";
    confidence = 0.55;
    reason = `Price in lower half of Bollinger Bands (z=${z.toFixed(2)}) — moderate bearish bias`;
  } else {
    direction = "neutral";
    confidence = 0.5;
    reason = `Price near Bollinger midline ($${mean.toFixed(2)}) — no clear directional signal`;
  }

  return { name: "Volatility Breakout", direction, confidence, reason, weight: 0.25 };
}

/** Signal 3: Volume-weighted Momentum */
function volumeMomentumSignal(prices: Price[]): Signal {
  if (prices.length < 10) {
    return { name: "Volume Momentum", direction: "neutral", confidence: 0.5, reason: "Insufficient data", weight: 0.25 };
  }

  const recent = prices.slice(-10);
  let upVolume = 0;
  let downVolume = 0;

  for (let i = 1; i < recent.length; i++) {
    const delta = recent[i].close - recent[i - 1].close;
    if (delta > 0) upVolume += recent[i].volume;
    else if (delta < 0) downVolume += recent[i].volume;
  }

  const totalVol = upVolume + downVolume;
  if (totalVol === 0) {
    return { name: "Volume Momentum", direction: "neutral", confidence: 0.5, reason: "No volume data", weight: 0.25 };
  }

  const upRatio = upVolume / totalVol;
  const isUp = upRatio > 0.5;
  const confidence = clamp(0.52 + Math.abs(upRatio - 0.5) * 0.8, 0.52, 0.88);

  return {
    name: "Volume Momentum",
    direction: isUp ? "up" : "down",
    confidence,
    reason: isUp
      ? `${(upRatio * 100).toFixed(0)}% of 10-day volume on up-days — strong buying pressure`
      : `${((1 - upRatio) * 100).toFixed(0)}% of 10-day volume on down-days — selling pressure dominates`,
    weight: 0.25,
  };
}

/** Signal 4: Trend Strength (ADX proxy using directional movement) */
function trendStrengthSignal(closes: number[]): Signal {
  if (closes.length < 15) {
    return { name: "Trend Strength", direction: "neutral", confidence: 0.5, reason: "Insufficient data", weight: 0.20 };
  }

  // Compare short-term vs medium-term momentum consistency
  const changes = closes.slice(-14).map((c, i, arr) => (i > 0 ? c - arr[i - 1] : 0)).slice(1);
  const upMoves = changes.filter((c) => c > 0).length;
  const downMoves = changes.filter((c) => c < 0).length;
  const consistency = Math.abs(upMoves - downMoves) / changes.length;
  const trendUp = upMoves > downMoves;

  // Also check if trend is accelerating
  const firstHalf = closes.slice(-14, -7);
  const secondHalf = closes.slice(-7);
  const firstReturn = (firstHalf[firstHalf.length - 1] - firstHalf[0]) / firstHalf[0];
  const secondReturn = (secondHalf[secondHalf.length - 1] - secondHalf[0]) / secondHalf[0];
  const accelerating = trendUp ? secondReturn > firstReturn : secondReturn < firstReturn;

  const confidence = clamp(0.52 + consistency * 0.3 + (accelerating ? 0.05 : 0), 0.52, 0.85);

  return {
    name: "Trend Strength",
    direction: trendUp ? "up" : "down",
    confidence,
    reason: trendUp
      ? `${upMoves}/13 days trending up${accelerating ? ", momentum accelerating" : ", momentum stable"}`
      : `${downMoves}/13 days trending down${accelerating ? ", selling pressure building" : ", pressure stable"}`,
    weight: 0.20,
  };
}

/** Run Model v2.0 prediction */
export function runPredictionV2(prices: Price[]): PredictionResult {
  const closes = prices.map((p) => p.close);

  const signals: Signal[] = [
    rocSignal(closes),
    volatilityBreakoutSignal(closes),
    volumeMomentumSignal(prices),
    trendStrengthSignal(closes),
  ];

  let upScore = 0;
  let downScore = 0;

  for (const signal of signals) {
    if (signal.direction === "up") {
      upScore += signal.weight * signal.confidence;
    } else if (signal.direction === "down") {
      downScore += signal.weight * signal.confidence;
    } else {
      upScore += signal.weight * 0.5;
      downScore += signal.weight * 0.5;
    }
  }

  const total = upScore + downScore;
  const prediction: "up" | "down" = upScore >= downScore ? "up" : "down";
  const rawConfidence = Math.max(upScore, downScore) / total;
  const confidence = parseFloat((0.52 + (rawConfidence - 0.5) * 0.8).toFixed(2));

  return { prediction, confidence, signals, model_version: MODEL_VERSION_2 };
}
