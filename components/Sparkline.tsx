"use client";

import { useEffect, useRef } from "react";

interface SparklineProps {
  prices: number[];
  positive: boolean;
  height?: number;
}

export default function Sparkline({ prices, positive, height = 40 }: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prices.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const pad = 2;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const toX = (i: number) => pad + (i / (prices.length - 1)) * (W - pad * 2);
    const toY = (v: number) => pad + (1 - (v - min) / range) * (H - pad * 2);

    const color = positive ? "#22c55e" : "#ef4444";

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, positive ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)");
    grad.addColorStop(1, "rgba(0,0,0,0)");

    // Bezier path
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(prices[0]));
    for (let i = 1; i < prices.length; i++) {
      const cpX = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(cpX, toY(prices[i - 1]), cpX, toY(prices[i]), toX(i), toY(prices[i]));
    }

    // Fill
    ctx.lineTo(toX(prices.length - 1), H);
    ctx.lineTo(toX(0), H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(prices[0]));
    for (let i = 1; i < prices.length; i++) {
      const cpX = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(cpX, toY(prices[i - 1]), cpX, toY(prices[i]), toX(i), toY(prices[i]));
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.stroke();
  }, [prices, positive]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: `${height}px`, display: "block" }}
    />
  );
}
