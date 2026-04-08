/**
 * Plain-English descriptions for every prediction signal.
 * Designed to help entry-level traders understand what each indicator
 * measures and why the AI weights it the way it does.
 */

export interface SignalDescription {
  /** Full indicator name */
  name: string;
  /** One-line tagline shown inline */
  tagline: string;
  /** Plain-English explanation of what the indicator measures */
  what: string;
  /** How to interpret the current signal reading */
  how: string;
  /** Beginner analogy */
  analogy: string;
  /** Indicator weight in the model */
  weight: string;
  /** Which model uses this signal */
  model: "v1" | "v2" | "both";
}

export const SIGNAL_INFO: Record<string, SignalDescription> = {

  // ── Model v1.0 Signals ──────────────────────────────────────────────────────

  "MA Crossover": {
    name: "Moving Average Crossover",
    tagline: "Short-term trend vs long-term trend",
    what: "Compares the average closing price over the last 50 days against the last 200 days. When the 50-day average rises above the 200-day, it's called a 'golden cross' — historically one of the most watched bullish signals on Wall Street.",
    how: "If the 50-day average is higher → bullish. If the 50-day falls below the 200-day ('death cross') → bearish. The further apart they are, the stronger the trend signal.",
    analogy: "Think of the 200-day as the highway — the long-run direction of travel. The 50-day is your lane speed right now. When your lane is faster than the highway, you're outpacing the trend.",
    weight: "35% of v1.0 model",
    model: "v1",
  },

  "RSI": {
    name: "Relative Strength Index",
    tagline: "Is the stock overbought or oversold?",
    what: "RSI measures how fast and how much a stock's price has moved over the last 14 days, on a scale of 0–100. It tells you whether recent buying or selling has been unusually strong.",
    how: "Above 70 = overbought (price may have run too hot, could pull back). Below 30 = oversold (heavy selling may be overdone, could bounce). Between 45–55 is neutral.",
    analogy: "Like a phone battery. A stock trading above RSI 70 is fully charged and might need to rest. Below 30, the battery is almost dead — often a sign it's due for a recharge.",
    weight: "30% of v1.0 model",
    model: "v1",
  },

  "MACD": {
    name: "Moving Average Convergence Divergence",
    tagline: "Is momentum building or fading?",
    what: "MACD tracks the relationship between a 12-day and 26-day exponential moving average. The difference between them forms the MACD line, while the 'histogram' shows whether that gap is growing or shrinking.",
    how: "Positive MACD → short-term trend stronger than long-term (bullish). Negative MACD → short-term weaker than long-term (bearish). An expanding histogram means momentum is accelerating.",
    analogy: "Imagine two runners — a sprinter (12-day) and a marathon runner (26-day). MACD tells you how far ahead the sprinter is. A growing gap means the sprinter is pulling away fast.",
    weight: "25% of v1.0 model",
    model: "v1",
  },

  "Momentum": {
    name: "Price Momentum (5-day)",
    tagline: "Raw short-term price direction",
    what: "The simplest signal: how much has the price moved in the last 5 trading days? Stocks that have been rising recently tend to keep rising short-term, and vice versa.",
    how: "Positive 5-day return → bullish momentum. Negative 5-day return → bearish. The larger the move, the stronger the signal.",
    analogy: "Like a ball rolling downhill — it keeps going in the same direction unless something stops it. Momentum captures whether the ball is currently rolling up or down.",
    weight: "10% of v1.0 model",
    model: "v1",
  },

  // ── Model v2.0 Signals ──────────────────────────────────────────────────────

  "Rate of Change": {
    name: "Rate of Change (ROC)",
    tagline: "How fast is the price moving?",
    what: "Rate of Change compares today's price to where it was exactly 10 and 20 days ago. It measures velocity — not just direction, but how quickly the stock is moving in that direction.",
    how: "Positive ROC → price is higher than it was (bullish). Negative ROC → price is lower (bearish). High ROC values signal strong trending conditions.",
    analogy: "Like checking a car's speedometer vs its position. You might be moving in the right direction, but ROC tells you if you're accelerating or braking.",
    weight: "30% of v2.0 model",
    model: "v2",
  },

  "Volatility Breakout": {
    name: "Bollinger Band Position",
    tagline: "Is price stretched beyond normal range?",
    what: "Bollinger Bands create dynamic price boundaries based on the stock's recent volatility. The upper and lower bands expand during volatile periods and contract when the stock trades quietly.",
    how: "Price above the upper band → potentially overbought, watch for reversal. Price below the lower band → potentially oversold, watch for bounce. Price near the middle → no strong signal.",
    analogy: "Imagine a rubber band around the stock price. Bollinger Bands measure how stretched that band is. Eventually, a very stretched band snaps back toward center.",
    weight: "25% of v2.0 model",
    model: "v2",
  },

  "Volume Momentum": {
    name: "Volume-Weighted Momentum",
    tagline: "Is money flowing in or out?",
    what: "This signal looks at the last 10 trading sessions and measures what percentage of the total trading volume happened on up-days vs down-days. High volume on up-days = buyers in control.",
    how: "More than 60% of volume on up-days → strong buying conviction (bullish). More on down-days → sellers in control (bearish). Volume confirms whether price moves are backed by real activity.",
    analogy: "Imagine a tug-of-war. The price direction is who's winning, but volume tells you how many people are pulling on each side. A small team winning means the lead could flip — a large team means conviction.",
    weight: "25% of v2.0 model",
    model: "v2",
  },

  "Trend Strength": {
    name: "Trend Consistency",
    tagline: "How steady is the trend?",
    what: "Counts how many of the last 13 trading days closed in the same direction (up or down). A stock closing up 10 of 13 days shows far more trend consistency than one bouncing randomly.",
    how: "More consistent up-days → strong uptrend. More consistent down-days → strong downtrend. Inconsistency (mixed days) signals uncertainty or consolidation.",
    analogy: "Think of it as an attendance record. A trend that shows up reliably every day is more trustworthy than one that only appears occasionally. Consistency builds conviction.",
    weight: "20% of v2.0 model",
    model: "v2",
  },
};

/** Get description, returning a safe fallback for unknown signal names */
export function getSignalInfo(name: string): SignalDescription | null {
  return SIGNAL_INFO[name] ?? null;
}
