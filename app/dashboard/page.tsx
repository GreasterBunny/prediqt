import { getAllStocks } from "@/services/stocks";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import StockCard from "@/components/StockCard";
import Header from "@/components/Header";

export const revalidate = 60;

export default async function DashboardPage() {
  const stocks = await getAllStocks();
  const isLive = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-2">
      <Header isLive={isLive} />

      <main className="mx-auto max-w-7xl pt-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Markets</h2>
            <p className="text-sm text-zinc-500">{stocks.length} stocks tracked</p>
          </div>
          <p className="text-xs text-zinc-600">
            Updated{" "}
            {new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stocks.map((data) => (
            <StockCard key={data.stock.id} data={data} />
          ))}
        </div>

        <p className="mt-12 text-center text-xs text-zinc-700">
          Prediqt · AI predictions are not financial advice
        </p>
      </main>
    </div>
  );
}
