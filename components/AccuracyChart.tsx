"use client";

import { useEffect, useRef } from "react";
import type { DayAccuracy } from "@/services/accuracy";

interface AccuracyChartProps {
  data: DayAccuracy[];
}

export default function AccuracyChart({ data }: AccuracyChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padX = 8;
    const padTop = 12;
    const padBottom = 20;
    const chartH = H - padTop - padBottom;

    const toX = (i: number) =>
      padX + (i / (data.length - 1)) * (W - padX * 2);
    const toY = (v: number) => padTop + (1 - v) * chartH;

    // Background grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    [0, 0.25, 0.5, 0.75, 1].forEach((v) => {
      ctx.beginPath();
      ctx.moveTo(padX, toY(v));
      ctx.lineTo(W - padX, toY(v));
      ctx.stroke();
    });

    // 50% baseline (dashed)
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padX, toY(0.5));
    ctx.lineTo(W - padX, toY(0.5));
    ctx.stroke();
    ctx.setLineDash([]);

    // 50% label
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "9px system-ui";
    ctx.fillText("50%", W - padX - 22, toY(0.5) - 3);

    // Collect valid points
    const points = data
      .map((d, i) => ({ i, acc: d.accuracy }))
      .filter((p) => !isNaN(p.acc));

    if (points.length < 2) {
      // Not enough data
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Accumulating data...", W / 2, H / 2);
      return;
    }

    // Area fill (split above/below 50%)
    // Above 50% → emerald tint, below → red tint
    const drawArea = (above: boolean) => {
      const threshold = 0.5;
      ctx.beginPath();
      let started = false;

      points.forEach(({ i, acc }) => {
        const x = toX(i);
        const y = toY(acc);
        const clampedY = toY(threshold);

        if (!started) {
          ctx.moveTo(x, clampedY);
          started = true;
        }
        ctx.lineTo(x, y);
      });

      const lastPt = points[points.length - 1];
      ctx.lineTo(toX(lastPt.i), toY(threshold));
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, toY(1), 0, toY(0));
      if (above) {
        gradient.addColorStop(0, "rgba(52,211,153,0)");
        gradient.addColorStop(1, "rgba(52,211,153,0.15)");
        ctx.save();
        ctx.rect(0, 0, W, toY(0.5));
        ctx.clip();
      } else {
        gradient.addColorStop(0, "rgba(248,113,113,0.15)");
        gradient.addColorStop(1, "rgba(248,113,113,0)");
        ctx.save();
        ctx.rect(0, toY(0.5), W, H);
        ctx.clip();
      }
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();
    };

    drawArea(true);
    drawArea(false);

    // Main accuracy line
    ctx.beginPath();
    points.forEach(({ i, acc }, idx) => {
      const x = toX(i);
      const y = toY(acc);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Dots at each point
    points.forEach(({ i, acc }) => {
      const x = toX(i);
      const y = toY(acc);
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = acc >= 0.5 ? "#34d399" : "#f87171";
      ctx.fill();
    });

    // X-axis labels (first, middle, last)
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "9px system-ui";
    ctx.textAlign = "center";

    const labelIdxs = [0, Math.floor(data.length / 2), data.length - 1];
    labelIdxs.forEach((idx) => {
      const d = data[idx];
      if (!d) return;
      const label = new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      ctx.fillText(label, toX(idx), H - 4);
    });
  }, [data]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          30-Day Accuracy Trend
        </p>
        <span className="text-[10px] text-zinc-600">7-day rolling window</span>
      </div>
      <canvas ref={canvasRef} className="h-36 w-full" style={{ display: "block" }} />
    </div>
  );
}
