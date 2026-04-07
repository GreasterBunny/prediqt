"use client";

import { useEffect, useRef } from "react";
import type { Price } from "@/types";

interface ChartComponentProps {
  prices: Price[];
  ticker: string;
}

export default function ChartComponent({ prices, ticker }: ChartComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prices.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padX = 12;
    const padY = 20;

    const closes = prices.map((p) => p.close);
    const minPrice = Math.min(...closes);
    const maxPrice = Math.max(...closes);
    const range = maxPrice - minPrice || 1;

    const toX = (i: number) => padX + (i / (prices.length - 1)) * (W - padX * 2);
    const toY = (v: number) => padY + (1 - (v - minPrice) / range) * (H - padY * 2);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padY + (i / 4) * (H - padY * 2);
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(W - padX, y);
      ctx.stroke();
    }

    // Gradient fill
    const isPositive = closes[closes.length - 1] >= closes[0];
    const gradColor = isPositive ? "52, 211, 153" : "248, 113, 113";
    const gradient = ctx.createLinearGradient(0, padY, 0, H - padY);
    gradient.addColorStop(0, `rgba(${gradColor}, 0.18)`);
    gradient.addColorStop(1, `rgba(${gradColor}, 0)`);

    ctx.beginPath();
    prices.forEach((p, i) => {
      const x = toX(i);
      const y = toY(p.close);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(toX(prices.length - 1), H - padY);
    ctx.lineTo(toX(0), H - padY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    prices.forEach((p, i) => {
      const x = toX(i);
      const y = toY(p.close);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = isPositive ? "#34d399" : "#f87171";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();
  }, [prices]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Price Chart
        </p>
        <span className="text-xs text-zinc-600">{ticker} · 60 days</span>
      </div>
      <canvas
        ref={canvasRef}
        className="h-48 w-full"
        style={{ display: "block" }}
      />
    </div>
  );
}
