import Header from "@/components/Header";
import PipelineClient from "./PipelineClient";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default function PipelinePage() {
  const isLive = isSupabaseConfigured();

  return (
    <div className="min-h-screen px-6 py-2" style={{ background: "var(--bg-base)" }}>
      <div className="mx-auto max-w-5xl">
        <Header isLive={isLive} backHref="/dashboard" backLabel="Dashboard" />
        <main className="pt-6 pb-16">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Data Pipeline</h1>
            <p className="text-sm text-[var(--text-2)] mt-1">
              Real market data · Automated daily cron · Manual controls
            </p>
          </div>
          {!isLive ? (
            <div className="mt-20 text-center">
              <p className="text-2xl font-bold text-white mb-2">Supabase required</p>
              <p className="text-[var(--text-2)] text-sm">
                The data pipeline requires a live database connection.
              </p>
            </div>
          ) : (
            <PipelineClient />
          )}
        </main>
      </div>
    </div>
  );
}
