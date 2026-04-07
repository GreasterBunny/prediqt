import type { Prediction } from "@/types";
import ConfidenceMeter from "./ConfidenceMeter";

interface PredictionCardProps {
  prediction: Prediction;
}

export default function PredictionCard({ prediction }: PredictionCardProps) {
  const isUp = prediction.prediction === "up";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-sm">
      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
        AI Prediction
      </p>

      <div className="mb-4 flex items-center gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
            isUp ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
          }`}
        >
          {isUp ? "↑" : "↓"}
        </span>
        <div>
          <p className={`text-xl font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
            {isUp ? "Bullish" : "Bearish"}
          </p>
          <p className="text-xs text-zinc-500">
            {new Date(prediction.timestamp).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <ConfidenceMeter confidence={prediction.confidence} />

      <p className="mt-3 text-right text-[10px] text-zinc-600">
        Model {prediction.model_version}
      </p>
    </div>
  );
}
