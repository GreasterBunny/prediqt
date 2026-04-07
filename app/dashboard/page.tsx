import { getAllStocks } from "@/services/stocks";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import StockCard from "@/components/StockCard";

export const revalidate = 60; // ISR: revalidate every 60 seconds when connected to Supabase

export default async function DashboardPage() {
  const stocks = await getAllStocks();
  const isLive = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8">
      {/* Header */}
      <header className="mx-auto mb-10 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Prediqt
            </h1>
            <p className="text-sm text-zinc-500">Signal over noise.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isLive ? "animate-pulse bg-emerald-400" : "bg-zinc-600"
              }`}
            />
            <span className="text-xs text-zinc-400">
              {isLive ? "Live" : "Mock data"}
            </span>
          </div>
        </div>

        <div className="mt-6 border-t border-zinc-800" />
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-400">
            {stocks.length} stocks tracked
          </h2>
          <p className="text-xs text-zinc-600">
            Updated{" "}
            {new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Stock grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stocks.map((data) => (
            <StockCard key={data.stock.id} data={data} />
          ))}
        </div>

        {/* Footer */}
        <p className="mt-12 text-center text-xs text-zinc-700">
          Prediqt · AI predictions are not financial advice
        </p>
      </main>
    </div>
  );
}
