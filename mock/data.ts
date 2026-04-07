import type { StockWithData } from "@/types";

function generatePriceHistory(basePrice: number, days = 60) {
  const history = [];
  let price = basePrice;
  const now = Date.now();

  for (let i = days; i >= 0; i--) {
    const change = (Math.random() - 0.48) * price * 0.03;
    const open = price;
    price = Math.max(price + change, 1);
    const high = Math.max(open, price) * (1 + Math.random() * 0.01);
    const low = Math.min(open, price) * (1 - Math.random() * 0.01);

    history.push({
      id: `price-${i}`,
      stock_id: "",
      timestamp: new Date(now - i * 86400000).toISOString(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(price.toFixed(2)),
      volume: Math.floor(Math.random() * 50000000 + 5000000),
    });
  }

  return history;
}

function generatePredictionHistory(stockId: string, count = 10) {
  const directions = ["up", "down"] as const;
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const prediction = directions[Math.floor(Math.random() * 2)];
    const actual = Math.random() > 0.4 ? prediction : directions[1 - directions.indexOf(prediction)];
    return {
      id: `pred-${stockId}-${i}`,
      stock_id: stockId,
      timestamp: new Date(now - (count - i) * 86400000).toISOString(),
      prediction,
      confidence: parseFloat((Math.random() * 0.4 + 0.55).toFixed(2)),
      model_version: "v1.0",
      actual: i < count - 1 ? actual : undefined,
    };
  });
}

const aaplHistory = generatePriceHistory(192);
const msftHistory = generatePriceHistory(415);
const nvdaHistory = generatePriceHistory(880);
const googHistory = generatePriceHistory(175);
const amznHistory = generatePriceHistory(188);
const metaHistory = generatePriceHistory(520);

export const MOCK_STOCKS: StockWithData[] = [
  {
    stock: { id: "aapl", ticker: "AAPL", name: "Apple Inc." },
    latestPrice: { ...aaplHistory[aaplHistory.length - 1], stock_id: "aapl" },
    prediction: {
      id: "pred-aapl-latest",
      stock_id: "aapl",
      timestamp: new Date().toISOString(),
      prediction: "up",
      confidence: 0.78,
      model_version: "v1.0",
    },
    indicators: { stock_id: "aapl", rsi: 58.4, macd: 1.23, sma_50: 188.5, sma_200: 182.3 },
    priceHistory: aaplHistory.map((p) => ({ ...p, stock_id: "aapl" })),
    predictionHistory: generatePredictionHistory("aapl"),
  },
  {
    stock: { id: "msft", ticker: "MSFT", name: "Microsoft Corp." },
    latestPrice: { ...msftHistory[msftHistory.length - 1], stock_id: "msft" },
    prediction: {
      id: "pred-msft-latest",
      stock_id: "msft",
      timestamp: new Date().toISOString(),
      prediction: "up",
      confidence: 0.82,
      model_version: "v1.0",
    },
    indicators: { stock_id: "msft", rsi: 62.1, macd: 3.45, sma_50: 408.2, sma_200: 395.7 },
    priceHistory: msftHistory.map((p) => ({ ...p, stock_id: "msft" })),
    predictionHistory: generatePredictionHistory("msft"),
  },
  {
    stock: { id: "nvda", ticker: "NVDA", name: "NVIDIA Corp." },
    latestPrice: { ...nvdaHistory[nvdaHistory.length - 1], stock_id: "nvda" },
    prediction: {
      id: "pred-nvda-latest",
      stock_id: "nvda",
      timestamp: new Date().toISOString(),
      prediction: "down",
      confidence: 0.65,
      model_version: "v1.0",
    },
    indicators: { stock_id: "nvda", rsi: 72.3, macd: -2.1, sma_50: 865.4, sma_200: 720.1 },
    priceHistory: nvdaHistory.map((p) => ({ ...p, stock_id: "nvda" })),
    predictionHistory: generatePredictionHistory("nvda"),
  },
  {
    stock: { id: "goog", ticker: "GOOG", name: "Alphabet Inc." },
    latestPrice: { ...googHistory[googHistory.length - 1], stock_id: "goog" },
    prediction: {
      id: "pred-goog-latest",
      stock_id: "goog",
      timestamp: new Date().toISOString(),
      prediction: "up",
      confidence: 0.71,
      model_version: "v1.0",
    },
    indicators: { stock_id: "goog", rsi: 55.8, macd: 0.87, sma_50: 172.4, sma_200: 165.9 },
    priceHistory: googHistory.map((p) => ({ ...p, stock_id: "goog" })),
    predictionHistory: generatePredictionHistory("goog"),
  },
  {
    stock: { id: "amzn", ticker: "AMZN", name: "Amazon.com Inc." },
    latestPrice: { ...amznHistory[amznHistory.length - 1], stock_id: "amzn" },
    prediction: {
      id: "pred-amzn-latest",
      stock_id: "amzn",
      timestamp: new Date().toISOString(),
      prediction: "down",
      confidence: 0.59,
      model_version: "v1.0",
    },
    indicators: { stock_id: "amzn", rsi: 44.2, macd: -1.34, sma_50: 190.1, sma_200: 178.6 },
    priceHistory: amznHistory.map((p) => ({ ...p, stock_id: "amzn" })),
    predictionHistory: generatePredictionHistory("amzn"),
  },
  {
    stock: { id: "meta", ticker: "META", name: "Meta Platforms Inc." },
    latestPrice: { ...metaHistory[metaHistory.length - 1], stock_id: "meta" },
    prediction: {
      id: "pred-meta-latest",
      stock_id: "meta",
      timestamp: new Date().toISOString(),
      prediction: "up",
      confidence: 0.74,
      model_version: "v1.0",
    },
    indicators: { stock_id: "meta", rsi: 60.5, macd: 4.12, sma_50: 512.3, sma_200: 468.7 },
    priceHistory: metaHistory.map((p) => ({ ...p, stock_id: "meta" })),
    predictionHistory: generatePredictionHistory("meta"),
  },
];

export function getMockStock(ticker: string): StockWithData | undefined {
  return MOCK_STOCKS.find((s) => s.stock.ticker.toLowerCase() === ticker.toLowerCase());
}
