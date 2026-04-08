"use client";

import { useEffect, useRef } from "react";
import type { EquityPoint } from "@/services/backtesting";

interface EquityChartProps {
  data: EquityPoint[];
  initialCapital: number;
}

export default function EquityChart({ data, initialCapital }: EquityChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const pad = { top: 20, right: 16, bottom: 32, left: 56 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    const allValues = [...data.map((d) => d.value), ...data.map((d) => d.benchmark), initialCapital];
    const minVal = Math.min(...allValues) * 0.99;
    const maxVal = Math.max(...allValues) * 1.01;
    const range = maxVal - minVal;

    const xAt = (i: number) => pad.left + (i / (data.length - 1)) * chartW;
    const yAt = (v: number) => pad.top + chartH - ((v - minVal) / range) * chartH;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    const gridSteps = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSteps; i++) {
      const y = pad.top + (i / gridSteps) * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();

      const val = maxVal - (i / gridSteps) * range;
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "10px system-ui";
      ctx.textAlign = "right";
      ctx.fillText("$" + val.toFixed(0), pad.left - 6, y + 4);
    }

    // Zero baseline (initial capital)
    const baselineY = yAt(initialCapital);
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, baselineY);
    ctx.lineTo(pad.left + chartW, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw benchmark line (buy-and-hold)
    ctx.beginPath();
    ctx.strokeStyle = "rgba(161,161,170,0.4)";
    ctx.lineWidth = 1.5;
    data.forEach((d, i) => {
      const x = xAt(i);
      const y = yAt(d.benchmark);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw equity curve (strategy)
    const finalValue = data[data.length - 1]?.value ?? initialCapital;
    const isPositive = finalValue >= initialCapital;
    const lineColor = isPositive ? "#22c55e" : "#ef4444";
    const fillColor = isPositive ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)";

    // Fill under curve
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xAt(i);
      const y = yAt(d.value);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(xAt(data.length - 1), pad.top + chartH);
    ctx.lineTo(pad.left, pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Equity line
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    data.forEach((d, i) => {
      const x = xAt(i);
      const y = yAt(d.value);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // X-axis date labels (every ~10 points)
    const labelEvery = Math.max(1, Math.floor(data.length / 5));
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    data.forEach((d, i) => {
      if (i % labelEvery === 0 || i === data.length - 1) {
        const x = xAt(i);
        const date = new Date(d.date);
        const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        ctx.fillText(label, x, pad.top + chartH + 18);
      }
    });

    // End dot
    const lastX = xAt(data.length - 1);
    const lastY = yAt(finalValue);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
  }, [data, initialCapital]);

  return (
    <div className="w-full" style={{ height: 220 }}>
      <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />
    </div>
  );
}
