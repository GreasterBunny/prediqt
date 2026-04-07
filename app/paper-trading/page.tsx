import Header from "@/components/Header";
import PaperTradingClient from "./PaperTradingClient";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default function PaperTradingPage() {
  const isLive = isSupabaseConfigured();

  return (
    <div className="min-h-screen px-6 py-2" style={{ background: "var(--bg-base)" }}>
      <div className="mx-auto max-w-5xl">
        <Header isLive={isLive} backHref="/dashboard" backLabel="Dashboard" />
        <main className="pt-6 pb-16">
          {!isLive ? (
            <div className="mt-20 text-center">
              <p className="text-2xl font-bold text-white mb-2">Supabase required</p>
              <p className="text-[var(--text-2)] text-sm">
                Paper trading requires a live database connection to persist trade state.
              </p>
            </div>
          ) : (
            <PaperTradingClient />
          )}
        </main>
      </div>
    </div>
  );
}
