"use client";

import { useEffect, useRef, useState } from "react";
import type { Price } from "@/types";

interface ChartComponentProps {
  prices: Price[];
  ticker: string;
}

const PERIODS = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "All", days: Infinity },
];

export default function ChartComponent({ prices, ticker }: ChartComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [period, setPeriod] = useState("1M");

  const filtered = PERIODS.find((p) => p.label === period)!;
  const sliced =
    filtered.days === Infinity
      ? prices
      : prices.slice(-filtered.days);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sliced.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padL = 56;
    const padR = 12;
    const padT = 12;
    const padB = 28;

    const closes = sliced.map((p) => p.close);
    const minPrice = Math.min(...closes);
    const maxPrice = Math.max(...closes);
    const range = maxPrice - minPrice || 1;
    const isPositive = closes[closes.length - 1] >= closes[0];
    const color = isPositive ? "#22c55e" : "#ef4444";

    const toX = (i: number) =>
      padL + (i / (sliced.length - 1)) * (W - padL - padR);
    const toY = (v: number) =>
      padT + (1 - (v - minPrice) / range) * (H - padT - padB);

    // Y-axis grid + labels
    const ySteps = 4;
    ctx.font = `${10 * dpr / dpr}px system-ui`;
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.textAlign = "right";
    for (let i = 0; i <= ySteps; i++) {
      const val = minPrice + (range * i) / ySteps;
      const y = toY(val);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillText(`$${val.toFixed(0)}`, padL - 6, y + 3.5);
    }

    // X-axis date labels (3 evenly spaced)
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    [0, Math.floor(sliced.length / 2), sliced.length - 1].forEach((idx) => {
      const d = sliced[idx];
      if (!d) return;
      const label = new Date(d.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      ctx.fillText(label, toX(idx), H - 6);
    });

    // Gradient fill
    const grad = ctx.createLinearGradient(0, padT, 0, H - padB);
    grad.addColorStop(0, isPositive ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)");
    grad.addColorStop(1, "rgba(0,0,0,0)");

    // Bezier path
    const buildPath = () => {
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(closes[0]));
      for (let i = 1; i < closes.length; i++) {
        const cpX = (toX(i - 1) + toX(i)) / 2;
        ctx.bezierCurveTo(cpX, toY(closes[i - 1]), cpX, toY(closes[i]), toX(i), toY(closes[i]));
      }
    };

    // Fill
    buildPath();
    ctx.lineTo(toX(closes.length - 1), H - padB);
    ctx.lineTo(toX(0), H - padB);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    buildPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Last price dot
    const lastX = toX(closes.length - 1);
    const lastY = toY(closes[closes.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, [sliced]);

  const open = sliced[0]?.close ?? 0;
  const last = sliced[sliced.length - 1]?.close ?? 0;
  const periodChange = last - open;
  const periodChangePct = open > 0 ? (periodChange / open) * 100 : 0;
  const isPos = periodChange >= 0;

  return (
    <div className="card p-5" style={{ background: "var(--bg-card)" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] text-[var(--text-3)] mb-1">{ticker} · Price</p>
          <div className="flex items-baseline gap-2">
            <span className="num text-2xl font-bold text-white">${last.toFixed(2)}</span>
            <span className={`num text-sm font-medium ${isPos ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
              {isPos ? "+" : ""}{periodChange.toFixed(2)} ({isPos ? "+" : ""}{periodChangePct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-0.5 rounded-lg bg-[var(--bg-raised)] p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPeriod(p.label)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                period === p.label
                  ? "bg-[var(--bg-hover)] text-white"
                  : "text-[var(--text-2)] hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: "200px", display: "block" }}
      />
    </div>
  );
}
