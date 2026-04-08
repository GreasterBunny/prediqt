/**
 * Phase 11 — Backtesting Engine
 * Simulates the prediction model on historical price data,
 * computing equity curve, win rate, Sharpe ratio, and max drawdown.
 */

import type { Price } from "@/types";
import { runPrediction } from "./predictions";

export interface BacktestTrade {
  date: string;
  direction: "up" | "down";    // model's prediction
  actual: "up" | "down";       // what actually happened
  correct: boolean;
  entryPrice: number;
  exitPrice: number;
  pnlPct: number;              // % return on the day
  portfolioValue: number;      // cumulative portfolio value after trade
}

export interface EquityPoint {
  date: string;
  value: number;
  benchmark: number;           // buy-and-hold for comparison
}

export interface BacktestResult {
  ticker: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalValue: number;
  totalReturn: number;
  totalReturnPct: number;
  benchmarkReturn: number;     // buy-and-hold total return
  benchmarkReturnPct: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWinPct: number;
  avgLossPct: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
}

const INITIAL_CAPITAL = 10_000;
const MIN_LOOKBACK = 30;   // Minimum days of history required to run prediction
const POSITION_SIZE = 0.95; // 95% of capital per trade

/**
 * Run the backtesting simulation.
 * Walks through prices from day MIN_LOOKBACK to end, predicting on price[:i],
 * then checking the next day's actual return.
 */
export function runBacktest(prices: Price[], ticker: string): BacktestResult {
  const trades: BacktestTrade[] = [];
  const equityCurve: EquityPoint[] = [];

  let portfolioValue = INITIAL_CAPITAL;
  let peakValue = INITIAL_CAPITAL;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;

  const dailyReturns: number[] = [];

  // Buy-and-hold baseline
  const startPrice = prices[MIN_LOOKBACK]?.close ?? prices[0].close;
  const endPrice = prices[prices.length - 1].close;

  // Walk-forward simulation
  for (let i = MIN_LOOKBACK; i < prices.length - 1; i++) {
    const history = prices.slice(0, i + 1);
    const { prediction } = runPrediction(history);

    const entryPrice = prices[i].close;
    const exitPrice = prices[i + 1].close;
    const actual: "up" | "down" = exitPrice >= entryPrice ? "up" : "down";
    const correct = prediction === actual;

    // Trade P&L: go long if predicting up, short if predicting down
    const rawReturn = (exitPrice - entryPrice) / entryPrice;
    const tradeReturn = prediction === "up" ? rawReturn : -rawReturn;
    const pnl = portfolioValue * POSITION_SIZE * tradeReturn;
    portfolioValue += pnl;

    // Buy-and-hold value
    const benchmarkValue = INITIAL_CAPITAL * (entryPrice / startPrice);

    // Drawdown tracking
    if (portfolioValue > peakValue) peakValue = portfolioValue;
    const drawdown = peakValue - portfolioValue;
    const drawdownPct = drawdown / peakValue;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPct = drawdownPct;
    }

    dailyReturns.push(tradeReturn);

    trades.push({
      date: prices[i + 1].timestamp.split("T")[0],
      direction: prediction,
      actual,
      correct,
      entryPrice,
      exitPrice,
      pnlPct: parseFloat((tradeReturn * 100).toFixed(3)),
      portfolioValue: parseFloat(portfolioValue.toFixed(2)),
    });

    equityCurve.push({
      date: prices[i + 1].timestamp.split("T")[0],
      value: parseFloat(portfolioValue.toFixed(2)),
      benchmark: parseFloat((INITIAL_CAPITAL * (exitPrice / startPrice)).toFixed(2)),
    });
  }

  // Metrics
  const winningTrades = trades.filter((t) => t.correct);
  const losingTrades = trades.filter((t) => !t.correct);
  const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;

  const avgWinPct =
    winningTrades.length > 0
      ? winningTrades.reduce((s, t) => s + t.pnlPct, 0) / winningTrades.length
      : 0;
  const avgLossPct =
    losingTrades.length > 0
      ? losingTrades.reduce((s, t) => s + t.pnlPct, 0) / losingTrades.length
      : 0;

  // Sharpe ratio (annualised, assume 252 trading days, risk-free ≈ 0)
  const meanReturn = dailyReturns.reduce((s, r) => s + r, 0) / Math.max(dailyReturns.length, 1);
  const variance =
    dailyReturns.reduce((s, r) => s + Math.pow(r - meanReturn, 2), 0) /
    Math.max(dailyReturns.length, 1);
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;

  const totalReturn = portfolioValue - INITIAL_CAPITAL;
  const totalReturnPct = totalReturn / INITIAL_CAPITAL;
  const benchmarkReturn = INITIAL_CAPITAL * (endPrice / startPrice) - INITIAL_CAPITAL;
  const benchmarkReturnPct = benchmarkReturn / INITIAL_CAPITAL;

  return {
    ticker,
    startDate: prices[MIN_LOOKBACK]?.timestamp.split("T")[0] ?? "",
    endDate: prices[prices.length - 1]?.timestamp.split("T")[0] ?? "",
    initialCapital: INITIAL_CAPITAL,
    finalValue: parseFloat(portfolioValue.toFixed(2)),
    totalReturn: parseFloat(totalReturn.toFixed(2)),
    totalReturnPct: parseFloat(totalReturnPct.toFixed(4)),
    benchmarkReturn: parseFloat(benchmarkReturn.toFixed(2)),
    benchmarkReturnPct: parseFloat(benchmarkReturnPct.toFixed(4)),
    winRate: parseFloat(winRate.toFixed(4)),
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    avgWinPct: parseFloat(avgWinPct.toFixed(3)),
    avgLossPct: parseFloat(avgLossPct.toFixed(3)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(3)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    maxDrawdownPct: parseFloat(maxDrawdownPct.toFixed(4)),
    trades,
    equityCurve,
  };
}
