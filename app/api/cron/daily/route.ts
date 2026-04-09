/**
 * GET /api/cron/daily
 *
 * Vercel Cron Job handler — runs the full data pipeline every weekday.
 * Schedule (vercel.json): "0 21 * * 1-5"  →  9 PM UTC = 4 PM ET market close
 *
 * Pipeline sequence:
 *   1. fetch-prices      — pull today's OHLCV from Polygon / Yahoo
 *   2. run-predictions   — compute AI predictions for all stocks
 *   3. resolve-predictions — mark previous predictions correct/incorrect
 *   4. paper-trading/execute — bot makes trades based on new signals
 *
 * Security: Vercel automatically sends Authorization: Bearer {CRON_SECRET}
 * Set CRON_SECRET in Vercel environment variables.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for the full pipeline

interface StepResult {
  step: string;
  ok: boolean;
  durationMs: number;
  data?: unknown;
  error?: string;
}

async function runStep(
  name: string,
  url: string,
  method: "GET" | "POST",
  baseUrl: string
): Promise<StepResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl}${url}`, {
      method,
      headers: { "Content-Type": "application/json" },
      // Don't pass the Authorization header downstream — these are internal calls
    });
    const data = await res.json();
    return {
      step: name,
      ok: res.ok,
      durationMs: Date.now() - start,
      data,
      ...(res.ok ? {} : { error: `HTTP ${res.status}` }),
    };
  } catch (err) {
    return {
      step: name,
      ok: false,
      durationMs: Date.now() - start,
      error: String(err),
    };
  }
}

async function runPipeline(request: NextRequest, isManual: boolean) {
  // ── Security check (cron secret only required for automated GET) ────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!isManual && cronSecret) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Skip weekends for automated cron only (not manual triggers)
  if (!isManual) {
    const dayOfWeek = new Date().getUTCDay(); // 0=Sun, 6=Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({
        skipped: true,
        reason: "Weekend — markets closed",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ── Derive base URL from the incoming request (works across all deployments) ─
  const host = new URL(request.url).origin;

  const pipelineStart = Date.now();
  const steps: StepResult[] = [];

  // ── Step 1: Fetch prices ────────────────────────────────────────────────────
  const pricesStep = await runStep(
    "fetch-prices",
    "/api/fetch-prices?mode=daily",
    "POST",
    host
  );
  steps.push(pricesStep);

  // Only continue if prices were fetched (or if it errored but we still want to run predictions)
  // ── Step 2: Run predictions ─────────────────────────────────────────────────
  const predictStep = await runStep(
    "run-predictions",
    "/api/run-predictions",
    "POST",
    host
  );
  steps.push(predictStep);

  // ── Step 3: Resolve previous predictions ────────────────────────────────────
  const resolveStep = await runStep(
    "resolve-predictions",
    "/api/resolve-predictions",
    "POST",
    host
  );
  steps.push(resolveStep);

  // ── Step 4: Paper trading execution ─────────────────────────────────────────
  const tradeStep = await runStep(
    "paper-trading/execute",
    "/api/paper-trading/execute",
    "POST",
    host
  );
  steps.push(tradeStep);

  const totalMs = Date.now() - pipelineStart;
  const allOk = steps.every((s) => s.ok);

  return NextResponse.json({
    success: allOk,
    totalDurationMs: totalMs,
    stepsRan: steps.length,
    timestamp: new Date().toISOString(),
    steps,
  });
}

export async function GET(request: NextRequest) {
  return runPipeline(request, false);
}

// POST = manual trigger from the Pipeline page (no weekend skip, no auth required)
export async function POST(request: NextRequest) {
  return runPipeline(request, true);
}
