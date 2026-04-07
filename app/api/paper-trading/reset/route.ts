import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";

export async function POST() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  // Deactivate all existing wallets
  await supabase.from("paper_wallet").update({ is_active: false }).eq("is_active", true);

  // Create fresh wallet
  const { data, error } = await supabase
    .from("paper_wallet")
    .insert({
      initial_balance: 10000,
      cash_balance: 10000,
      experiment_days: 10,
      is_active: true,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, wallet: data });
}
