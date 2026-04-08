import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getAlerts, getUnreadCount, createAlert, markAllRead } from "@/services/alerts";

export const dynamic = "force-dynamic";

/** GET /api/alerts — list alerts with unread count */
export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ alerts: [], unreadCount: 0 });
  }

  const [alerts, unreadCount] = await Promise.all([
    getAlerts(supabase),
    getUnreadCount(supabase),
  ]);

  return NextResponse.json({ alerts, unreadCount });
}

/** POST /api/alerts — create an alert */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  try {
    const body = await request.json() as {
      ticker?: string;
      stock_id?: string;
      type: "prediction_flip" | "high_confidence" | "trade_closed" | "system";
      title: string;
      message: string;
    };

    const alert = await createAlert(supabase, {
      ticker: body.ticker ?? null,
      stock_id: body.stock_id ?? null,
      type: body.type,
      title: body.title,
      message: body.message,
    });

    if (!alert) {
      return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
    }

    return NextResponse.json(alert, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

/** PATCH /api/alerts — mark all alerts as read */
export async function PATCH() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  await markAllRead(supabase);
  return NextResponse.json({ success: true });
}
