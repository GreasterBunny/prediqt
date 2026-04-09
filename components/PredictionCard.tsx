import type { Prediction } from "@/types";
import { IconTriangleUp, IconTriangleDown } from "./Icons";

interface PredictionCardProps {
  prediction: Prediction;
}

export default function PredictionCard({ prediction }: PredictionCardProps) {
  const isUp = prediction.prediction === "up";
  const pct = Math.round(prediction.confidence * 100);
  const isHigh = pct >= 75;

  return (
    <div className="card p-5 flex flex-col gap-4" style={{ background: "var(--bg-card)" }}>
      <p className="text-[11px] font-medium text-[var(--text-3)] tracking-wide uppercase">
        AI Prediction
      </p>

      {/* Direction */}
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
            isUp ? "bg-[var(--green-dim)]" : "bg-[var(--red-dim)]"
          }`}
        >
          {isUp
            ? <IconTriangleUp size={18} className="text-[var(--green)]" />
            : <IconTriangleDown size={18} className="text-[var(--red)]" />}
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
          <span
            className="num font-semibold"
            style={{ color: isUp ? "var(--green)" : "var(--red)" }}
          >
            {pct}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full" style={{ background: "var(--bg-raised)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: isUp ? "var(--green)" : "var(--red)",
            }}
          />
        </div>
        {isHigh && (
          <p className={`text-[10px] mt-1.5 ${isUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
            High confidence signal
          </p>
        )}
      </div>

      <p className="text-[10px] text-[var(--text-3)] mt-auto">Model {prediction.model_version}</p>
    </div>
  );
}
