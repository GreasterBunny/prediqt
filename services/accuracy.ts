import type { Prediction } from "@/types";

export interface DayAccuracy {
  date: string;        // ISO date string YYYY-MM-DD
  correct: number;
  total: number;
  accuracy: number;   // 0–1, NaN if no data
}

export interface AccuracyMetrics {
  total: number;
  correct: number;
  accuracy: number;          // 0–1
  upTotal: number;
  upCorrect: number;
  upAccuracy: number;        // 0–1
  downTotal: number;
  downCorrect: number;
  downAccuracy: number;      // 0–1
  streak: number;            // count of current run
  streakType: "correct" | "incorrect" | null;
  dailyAccuracy: DayAccuracy[];  // last 30 days, for chart
}

type ResolvedPrediction = Prediction & { actual: "up" | "down" };

function toDateStr(iso: string): string {
  return iso.slice(0, 10);
}

export function computeAccuracy(
  history: Array<Prediction & { actual?: "up" | "down" }>
): AccuracyMetrics {
  const resolved = history.filter(
    (p): p is ResolvedPrediction => p.actual !== undefined
  );

  // Overall
  const correct = resolved.filter((p) => p.prediction === p.actual).length;
  const total = resolved.length;
  const accuracy = total > 0 ? correct / total : 0;

  // Up predictions
  const upPreds = resolved.filter((p) => p.prediction === "up");
  const upCorrect = upPreds.filter((p) => p.actual === "up").length;
  const upAccuracy = upPreds.length > 0 ? upCorrect / upPreds.length : 0;

  // Down predictions
  const downPreds = resolved.filter((p) => p.prediction === "down");
  const downCorrect = downPreds.filter((p) => p.actual === "down").length;
  const downAccuracy = downPreds.length > 0 ? downCorrect / downPreds.length : 0;

  // Current streak — iterate from most recent resolved
  const sorted = [...resolved].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  let streak = 0;
  let streakType: AccuracyMetrics["streakType"] = null;
  for (const p of sorted) {
    const isCorrect = p.prediction === p.actual;
    if (streakType === null) {
      streakType = isCorrect ? "correct" : "incorrect";
      streak = 1;
    } else if (
      (streakType === "correct" && isCorrect) ||
      (streakType === "incorrect" && !isCorrect)
    ) {
      streak++;
    } else {
      break;
    }
  }

  // Daily accuracy for last 30 days
  const now = Date.now();
  const dailyAccuracy: DayAccuracy[] = [];

  for (let i = 29; i >= 0; i--) {
    const date = toDateStr(new Date(now - i * 86400000).toISOString());

    // 7-day rolling window ending on this date
    const windowEnd = new Date(date + "T23:59:59Z").getTime();
    const windowStart = windowEnd - 7 * 86400000;

    const windowPreds = resolved.filter((p) => {
      const t = new Date(p.timestamp).getTime();
      return t >= windowStart && t <= windowEnd;
    });

    const wCorrect = windowPreds.filter((p) => p.prediction === p.actual).length;
    const wTotal = windowPreds.length;

    dailyAccuracy.push({
      date,
      correct: wCorrect,
      total: wTotal,
      accuracy: wTotal > 0 ? wCorrect / wTotal : NaN,
    });
  }

  return {
    total,
    correct,
    accuracy,
    upTotal: upPreds.length,
    upCorrect,
    upAccuracy,
    downTotal: downPreds.length,
    downCorrect,
    downAccuracy,
    streak,
    streakType,
    dailyAccuracy,
  };
}
