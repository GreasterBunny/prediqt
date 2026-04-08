import Header from "@/components/Header";
import BacktestingClient from "./BacktestingClient";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default function BacktestingPage() {
  const isLive = isSupabaseConfigured();
  return (
    <div className="min-h-screen px-6 py-2" style={{ background: "var(--bg-base)" }}>
      <div className="mx-auto max-w-5xl">
        <Header isLive={isLive} backHref="/dashboard" backLabel="Dashboard" />
        <main className="pt-6 pb-16">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Backtesting Engine</h1>
            <p className="text-sm text-[var(--text-2)] mt-1">
              Walk-forward simulation of the prediction model on historical price data.
            </p>
          </div>
          <BacktestingClient />
        </main>
      </div>
    </div>
  );
}
