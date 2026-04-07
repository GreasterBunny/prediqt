interface ConfidenceMeterProps {
  confidence: number;
}

export default function ConfidenceMeter({ confidence }: ConfidenceMeterProps) {
  const pct = Math.round(confidence * 100);
  const barColor =
    pct >= 75 ? "var(--green)" : pct >= 60 ? "#eab308" : "#f97316";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--text-3)]">Confidence</span>
        <span className="num font-semibold text-white">{pct}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-[var(--bg-raised)]">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}
