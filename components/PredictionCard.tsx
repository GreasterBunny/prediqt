import type { Prediction } from "@/types";

interface PredictionCardProps {
  prediction: Prediction;
}

export default function PredictionCard({ prediction }: PredictionCardProps) {
  const isUp = prediction.prediction === "up";
  const pct = Math.round(prediction.confidence * 100);

  return (
    <div className="card p-5 flex flex-col gap-4" style={{ background: "var(--bg-card)" }}>
      <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide">
        AI Prediction
      </p>

      {/* Direction */}
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${
            isUp ? "bg-[var(--green-dim)]" : "bg-[var(--red-dim)]"
          }`}
        >
          {isUp ? "▲" : "▼"}
        </div>
        <div>
          <p className={`text-2xl font-bold leading-none ${isUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
            {isUp ? "Bullish" : "Bearish"}
          </p>
          <p className="text-xs text-[var(--text-2)] mt-1">
            {new Date(prediction.timestamp).toLocaleDateString("en-US", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-[var(--text-3)]">Confidence</span>
          <span className="num font-semibold text-white">{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[var(--bg-raised)]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: pct >= 75 ? "var(--green)" : pct >= 60 ? "#eab308" : "#f97316",
            }}
          />
        </div>
      </div>

      <p className="text-[10px] text-[var(--text-3)] mt-auto">Model {prediction.model_version}</p>
    </div>
  );
}
