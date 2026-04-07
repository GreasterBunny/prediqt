import { getAllStocks } from "@/services/stocks";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import StockCard from "@/components/StockCard";
import Header from "@/components/Header";

export const revalidate = 60;

export default async function DashboardPage() {
  const stocks = await getAllStocks();
  const isLive = isSupabaseConfigured();

  const bullish = stocks.filter((s) => s.prediction.prediction === "up").length;
  const bearish = stocks.length - bullish;
  const avgConf = stocks.length
    ? Math.round((stocks.reduce((a, s) => a + s.prediction.confidence, 0) / stocks.length) * 100)
    : 0;

  return (
    <div className="min-h-screen px-6 py-2" style={{ background: "var(--bg-base)" }}>
      <div className="mx-auto max-w-7xl">
        <Header isLive={isLive} />

        <main className="pt-8 pb-16">
          {/* Page title + stats row */}
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Markets</h1>
              <p className="text-sm text-[var(--text-2)] mt-0.5">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>

            {/* Summary pills */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                style={{ background: "var(--green-dim)", color: "var(--green)" }}>
                <span>▲</span>
                <span className="num">{bullish} bullish</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                style={{ background: "var(--red-dim)", color: "var(--red)" }}>
                <span>▼</span>
                <span className="num">{bearish} bearish</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                style={{ background: "var(--bg-raised)", color: "var(--text-2)" }}>
                <span className="num">{avgConf}% avg conf.</span>
              </div>
            </div>
          </div>

          {/* Stock grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stocks.map((data) => (
              <StockCard key={data.stock.id} data={data} />
            ))}
          </div>

          <p className="mt-12 text-center text-xs text-[var(--text-3)]">
            Prediqt · AI predictions are not financial advice
          </p>
        </main>
      </div>
    </div>
  );
}
