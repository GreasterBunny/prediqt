import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { tickBot } from "@/services/paper-trading";

async function handleTick() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  try {
    const result = await tickBot(supabase);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[paper-trading/tick]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * GET — called by Vercel cron every 5 minutes.
 * Validates CRON_SECRET if set.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return handleTick();
}

/**
 * POST — called by the frontend when the page is open (browser-driven fallback).
 * No auth required.
 */
export async function POST() {
  return handleTick();
}
