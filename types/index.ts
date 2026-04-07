export interface Stock {
  id: string;
  ticker: string;
  name: string;
}

export interface Price {
  id: string;
  stock_id: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicators {
  stock_id: string;
  rsi: number;
  macd: number;
  sma_50: number;
  sma_200: number;
}

export interface Prediction {
  id: string;
  stock_id: string;
  timestamp: string;
  prediction: "up" | "down";
  confidence: number;
  model_version: string;
}

export interface Signal {
  name: string;
  direction: "up" | "down" | "neutral";
  confidence: number;
  reason: string;
  weight: number;
}

export interface StockWithData {
  stock: Stock;
  latestPrice: Price;
  prediction: Prediction;
  indicators: Indicators;
  priceHistory: Price[];
  predictionHistory: Array<Prediction & { actual?: "up" | "down" }>;
}
