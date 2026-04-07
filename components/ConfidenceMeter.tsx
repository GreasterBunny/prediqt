interface ConfidenceMeterProps {
  confidence: number; // 0–1
}

export default function ConfidenceMeter({ confidence }: ConfidenceMeterProps) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 75 ? "bg-emerald-500" : pct >= 60 ? "bg-yellow-500" : "bg-orange-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>Confidence</span>
        <span className="font-medium text-white">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-700">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
