/**
 * Phase 7 — Real Market Data Pipeline
 *
 * Priority order:
 *   1. Polygon.io   — POLYGON_API_KEY set → reliable, adjusted OHLCV
 *   2. Yahoo Finance — no key needed → unofficial but works for demo
 *
 * Both sources return the same OHLCVBar shape so callers don't care which fired.
 */

export interface OHLCVBar {
  date: string;   // "YYYY-MM-DD"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type DataSource = "polygon" | "yahoo" | "none";

export interface FetchResult {
  bars: OHLCVBar[];
  source: DataSource;
  ticker: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  return toISODate(new Date(Date.now() - n * 86_400_000));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Polygon.io ───────────────────────────────────────────────────────────────

interface PolygonResult {
  o: number; h: number; l: number; c: number; v: number; t: number;
}

async function polygonRange(
  ticker: string,
  from: string,
  to: string
): Promise<OHLCVBar[]> {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) return [];

  const url =
    `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}` +
    `?adjusted=true&sort=asc&limit=300&apiKey=${apiKey}`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    console.warn(`[polygon] ${ticker} HTTP ${res.status}`);
    return [];
  }

  const json = await res.json() as { status: string; results?: PolygonResult[] };
  if (json.status !== "OK" || !json.results?.length) return [];

  return json.results.map((r) => ({
    date: toISODate(new Date(r.t)),
    open:   parseFloat(r.o.toFixed(4)),
    high:   parseFloat(r.h.toFixed(4)),
    low:    parseFloat(r.l.toFixed(4)),
    close:  parseFloat(r.c.toFixed(4)),
    volume: Math.round(r.v),
  }));
}

// ─── Yahoo Finance (unofficial, no key required) ───────────────────────────────

interface YahooChart {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: (number | null)[];
          high: (number | null)[];
          low:  (number | null)[];
          close:(number | null)[];
          volume:(number | null)[];
        }>;
      };
    }> | null;
    error: unknown;
  };
}

async function yahooHistory(ticker: string, days: number): Promise<OHLCVBar[]> {
  // Yahoo uses different tickers for some symbols — handle . → - substitution
  const yahooTicker = ticker.replace(".", "-");
  const range = days <= 7 ? "5d" : days <= 30 ? "1mo" : days <= 90 ? "3mo" : "6mo";
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}` +
    `?interval=1d&range=${range}&includeAdjustedClose=true`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      console.warn(`[yahoo] ${ticker} HTTP ${res.status}`);
      return [];
    }

    const json = await res.json() as YahooChart;
    const result = json.chart?.result?.[0];
    if (!result) return [];

    const { timestamp, indicators } = result;
    const q = indicators.quote[0];
    const bars: OHLCVBar[] = [];

    for (let i = 0; i < timestamp.length; i++) {
      const o = q.open[i];
      const h = q.high[i];
      const l = q.low[i];
      const c = q.close[i];
      const v = q.volume[i];
      if (o == null || h == null || l == null || c == null || v == null) continue;

      bars.push({
        date: toISODate(new Date(timestamp[i] * 1000)),
        open:   parseFloat(o.toFixed(4)),
        high:   parseFloat(h.toFixed(4)),
        low:    parseFloat(l.toFixed(4)),
        close:  parseFloat(c.toFixed(4)),
        volume: Math.round(v),
      });
    }
    return bars;
  } catch (err) {
    console.warn(`[yahoo] ${ticker} error:`, err);
    return [];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch historical daily bars for `ticker`.
 * Tries Polygon first, falls back to Yahoo Finance.
 * @param days  How many calendar days back to fetch (default 100)
 */
export async function fetchPriceHistory(
  ticker: string,
  days = 100
): Promise<FetchResult> {
  const from = daysAgo(days);
  const to   = toISODate(new Date());

  // 1. Polygon
  if (process.env.POLYGON_API_KEY) {
    const bars = await polygonRange(ticker, from, to);
    if (bars.length > 0) return { bars, source: "polygon", ticker };
  }

  // 2. Yahoo Finance
  const bars = await yahooHistory(ticker, days);
  if (bars.length > 0) return { bars, source: "yahoo", ticker };

  return { bars: [], source: "none", ticker };
}

/**
 * Fetch data for many tickers with a small delay between calls
 * to avoid hitting rate limits on the free Polygon tier (5 req/min).
 */
export async function fetchAllTickers(
  tickers: string[],
  days = 100,
  delayMs = 250
): Promise<FetchResult[]> {
  const results: FetchResult[] = [];
  for (const ticker of tickers) {
    const result = await fetchPriceHistory(ticker, days);
    results.push(result);
    if (delayMs > 0) await sleep(delayMs);
  }
  return results;
}

/**
 * Returns the most recent bar for a single ticker.
 * Used by the paper-trading bot to get current prices.
 */
export async function fetchLatestBar(ticker: string): Promise<OHLCVBar | null> {
  const result = await fetchPriceHistory(ticker, 5);
  if (result.bars.length === 0) return null;
  return result.bars[result.bars.length - 1];
}

/** Check which data source is available */
export function detectDataSource(): DataSource {
  if (process.env.POLYGON_API_KEY) return "polygon";
  return "yahoo"; // Yahoo always available as fallback
}
