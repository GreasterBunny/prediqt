import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getOrCreateWallet, executeBotCycle } from "@/services/paper-trading";

/** GET — return bot state for the active wallet */
export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  try {
    const wallet = await getOrCreateWallet(supabase);
    return NextResponse.json({
      is_running: wallet.is_running,
      mode: wallet.mode,
      run_until: wallet.run_until,
      schedule_start: wallet.schedule_start,
      schedule_end: wallet.schedule_end,
      last_cycle_at: wallet.last_cycle_at,
      total_cycles: wallet.total_cycles,
      cash_balance: wallet.cash_balance,
      initial_balance: wallet.initial_balance,
    });
  } catch (err) {
    console.error("[paper-trading/bot GET]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/** POST — start or stop the bot */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  try {
    const body = await request.json() as {
      action: "start" | "stop";
      mode?: string;
      run_until?: string;
      schedule_start?: string;
      schedule_end?: string;
      closePositions?: boolean;
    };

    const { action } = body;
    const wallet = await getOrCreateWallet(supabase);

    if (action === "start") {
      const updates: Record<string, unknown> = {
        is_running: true,
        last_cycle_at: null, // reset so it runs immediately on next tick
      };

      if (body.mode) updates.mode = body.mode;
      if (body.run_until !== undefined) updates.run_until = body.run_until;
      if (body.schedule_start !== undefined) updates.schedule_start = body.schedule_start;
      if (body.schedule_end !== undefined) updates.schedule_end = body.schedule_end;

      const { error } = await supabase
        .from("paper_wallet")
        .update(updates)
        .eq("id", wallet.id);

      if (error) throw new Error(error.message);

      return NextResponse.json({ success: true, action: "started" });
    }

    if (action === "stop") {
      const updates: Record<string, unknown> = { is_running: false };

      const { error } = await supabase
        .from("paper_wallet")
        .update(updates)
        .eq("id", wallet.id);

      if (error) throw new Error(error.message);

      // Optionally force-close all open positions
      if (body.closePositions) {
        await executeBotCycle(supabase, { forceCloseAll: true });
      }

      return NextResponse.json({ success: true, action: "stopped" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[paper-trading/bot POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
