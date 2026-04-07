import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { executeBotCycle } from "@/services/paper-trading";

export async function POST() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  try {
    const result = await executeBotCycle(supabase);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[paper-trading/execute]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
