/**
 * Phase 10 — News Sentiment Layer
 * Fetches financial news headlines (Finnhub or mock),
 * then analyzes with Claude AI for a sentiment score.
 */

import Anthropic from "@anthropic-ai/sdk";

export interface SentimentResult {
  ticker: string;
  sentimentScore: number;   // -1 (very bearish) to +1 (very bullish)
  sentimentLabel: "bullish" | "bearish" | "neutral";
  headlineCount: number;
  summary: string;
  headlines: string[];
  analyzedAt: string;
  source: "ai" | "keyword" | "mock" | "cache";
}

// ─── Mock news for when Finnhub is not configured ────────────────────────────

const MOCK_NEWS: Record<string, string[]> = {
  AAPL: [
    "Apple reports record iPhone sales in Q4, beats earnings expectations",
    "Apple Vision Pro demand surges ahead of holiday season",
    "Analysts upgrade AAPL to buy on strong services revenue growth",
    "Apple expands AI features across product lineup",
  ],
  MSFT: [
    "Microsoft Azure cloud revenue grows 28% year-over-year",
    "Copilot integration drives Office 365 subscription growth",
    "Microsoft beats Wall Street estimates for third consecutive quarter",
    "MSFT raises dividend as cash flow hits all-time high",
  ],
  NVDA: [
    "NVIDIA data center revenue triples amid AI infrastructure boom",
    "Blackwell GPU supply constraints easing faster than expected",
    "NVIDIA partners with major cloud providers for next-gen AI chips",
    "Analysts raise NVDA price target to $1500 on sustained demand",
  ],
  GOOG: [
    "Alphabet's Google Cloud posts strongest growth in two years",
    "Gemini AI integration boosts Search ad revenue",
    "Google antitrust ruling creates uncertainty for ad business",
    "YouTube ad revenue accelerates on new shopping features",
  ],
  AMZN: [
    "Amazon AWS market share expands as enterprise AI spending rises",
    "Amazon Prime membership reaches 200 million globally",
    "Retail margins improve sharply on logistics efficiency gains",
    "AMZN announces $10B AI data center expansion in North America",
  ],
  META: [
    "Meta's Threads platform surpasses 300 million daily active users",
    "Meta AI assistant rollout driving engagement across all apps",
    "Reality Labs losses narrow as Quest headset sales accelerate",
    "Instagram Reels ad revenue surpasses TikTok estimates",
  ],
};

function getMockHeadlines(ticker: string): string[] {
  return MOCK_NEWS[ticker] ?? [
    `${ticker} releases quarterly earnings report`,
    `Analysts maintain neutral rating on ${ticker}`,
    `${ticker} announces strategic partnership deal`,
  ];
}

// ─── Finnhub news fetch ───────────────────────────────────────────────────────

async function fetchFinnhubNews(ticker: string): Promise<string[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];

  try {
    const to = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - 7 * 86400 * 1000).toISOString().split("T")[0];
    const url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const articles = await res.json() as Array<{ headline: string }>;
    return articles.slice(0, 10).map((a) => a.headline).filter(Boolean);
  } catch {
    return [];
  }
}

// ─── Keyword-based fallback sentiment ─────────────────────────────────────────

const BULLISH_WORDS = ["beats", "record", "growth", "surge", "upgrade", "strong", "expands", "rises", "high", "profit", "gain"];
const BEARISH_WORDS = ["miss", "decline", "loss", "downgrade", "weak", "falls", "cut", "layoff", "concern", "risk", "drop"];

function keywordSentiment(headlines: string[]): SentimentResult {
  let score = 0;
  for (const h of headlines) {
    const lower = h.toLowerCase();
    for (const w of BULLISH_WORDS) if (lower.includes(w)) score += 1;
    for (const w of BEARISH_WORDS) if (lower.includes(w)) score -= 1;
  }
  const normalized = Math.max(-1, Math.min(1, score / Math.max(headlines.length, 1)));
  const label = normalized > 0.15 ? "bullish" : normalized < -0.15 ? "bearish" : "neutral";
  return {
    ticker: "",
    sentimentScore: parseFloat(normalized.toFixed(3)),
    sentimentLabel: label,
    headlineCount: headlines.length,
    summary: `Keyword analysis of ${headlines.length} headlines. Market sentiment appears ${label} based on language patterns.`,
    headlines,
    analyzedAt: new Date().toISOString(),
    source: "keyword",
  };
}

// ─── Claude AI analysis ───────────────────────────────────────────────────────

async function claudeSentiment(ticker: string, headlines: string[]): Promise<SentimentResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a financial analyst. Analyze these recent news headlines for ${ticker} stock and provide a structured sentiment assessment.

Headlines:
${headlines.map((h, i) => `${i + 1}. ${h}`).join("\n")}

Respond with a JSON object only (no markdown, no explanation):
{
  "sentimentScore": <float from -1.0 to 1.0, where -1=very bearish, 0=neutral, 1=very bullish>,
  "sentimentLabel": <"bullish" | "bearish" | "neutral">,
  "summary": <2-sentence concise analysis of the news sentiment and what it means for the stock>
}`;

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  const parsed = JSON.parse(text.trim()) as {
    sentimentScore: number;
    sentimentLabel: "bullish" | "bearish" | "neutral";
    summary: string;
  };

  return {
    ticker,
    sentimentScore: parseFloat(parsed.sentimentScore.toFixed(3)),
    sentimentLabel: parsed.sentimentLabel,
    headlineCount: headlines.length,
    summary: parsed.summary,
    headlines,
    analyzedAt: new Date().toISOString(),
    source: "ai",
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function analyzeSentiment(ticker: string): Promise<SentimentResult> {
  // 1. Get headlines
  let headlines = await fetchFinnhubNews(ticker);
  if (headlines.length === 0) {
    headlines = getMockHeadlines(ticker);
  }

  // 2. Analyze
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const result = await claudeSentiment(ticker, headlines);
      result.ticker = ticker;
      return result;
    } catch (err) {
      console.warn("[sentiment] Claude failed, falling back to keyword:", err);
    }
  }

  // Keyword fallback
  const result = keywordSentiment(headlines);
  result.ticker = ticker;
  return result;
}

/** Convert sentiment score to a prediction Signal weight */
export function sentimentToSignal(result: SentimentResult) {
  const direction =
    result.sentimentScore > 0.1 ? "up" :
    result.sentimentScore < -0.1 ? "down" : "neutral";

  const confidence = Math.min(0.55 + Math.abs(result.sentimentScore) * 0.3, 0.85);

  return {
    name: "News Sentiment",
    direction: direction as "up" | "down" | "neutral",
    confidence: parseFloat(confidence.toFixed(3)),
    reason: result.summary.split(".")[0] + ".",
    weight: 0.10,
  };
}
