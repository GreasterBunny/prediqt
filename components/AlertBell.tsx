"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Alert } from "@/services/alerts";
import { IconBell, IconRepeat, IconLightning, IconBriefcase, IconInfo } from "./Icons";

interface AlertsResponse {
  alerts: Alert[];
  unreadCount: number;
}

function AlertTypeIcon({ type }: { type: string }) {
  const cls = "flex-shrink-0";
  switch (type) {
    case "prediction_flip":
      return (
        <span className={`${cls} flex h-7 w-7 items-center justify-center rounded-full`}
          style={{ background: "rgba(161,161,170,0.10)" }}>
          <IconRepeat size={13} className="text-[var(--text-2)]" />
        </span>
      );
    case "high_confidence":
      return (
        <span className={`${cls} flex h-7 w-7 items-center justify-center rounded-full`}
          style={{ background: "var(--gold-dim)" }}>
          <IconLightning size={13} className="text-[var(--gold)]" />
        </span>
      );
    case "trade_closed":
      return (
        <span className={`${cls} flex h-7 w-7 items-center justify-center rounded-full`}
          style={{ background: "rgba(34,197,94,0.10)" }}>
          <IconBriefcase size={13} className="text-[var(--green)]" />
        </span>
      );
    default:
      return (
        <span className={`${cls} flex h-7 w-7 items-center justify-center rounded-full`}
          style={{ background: "rgba(161,161,170,0.08)" }}>
          <IconInfo size={13} className="text-[var(--text-3)]" />
        </span>
      );
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AlertBell() {
  const [data, setData] = useState<AlertsResponse>({ alerts: [], unreadCount: 0 });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) setData(await res.json() as AlertsResponse);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpen() {
    setOpen((o) => !o);
    if (!open && data.unreadCount > 0) {
      await fetch("/api/alerts", { method: "PATCH" });
      setData((prev) => ({
        ...prev,
        unreadCount: 0,
        alerts: prev.alerts.map((a) => ({ ...a, is_read: true })),
      }));
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-[var(--bg-raised)]"
        aria-label="Notifications"
      >
        <IconBell size={16} className="text-[var(--text-2)]" />
        {data.unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 flex items-center justify-center rounded-full text-[9px] font-bold text-black px-0.5"
            style={{ background: "var(--gold)" }}
          >
            {data.unreadCount > 9 ? "9+" : data.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-mid)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {data.alerts.length > 0 && (
              <button
                onClick={async () => {
                  await fetch("/api/alerts", { method: "PATCH" });
                  setData((prev) => ({
                    ...prev,
                    unreadCount: 0,
                    alerts: prev.alerts.map((a) => ({ ...a, is_read: true })),
                  }));
                }}
                className="text-[10px] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {data.alerts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="flex justify-center mb-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ background: "var(--bg-raised)" }}>
                    <IconBell size={18} className="text-[var(--text-3)]" />
                  </span>
                </div>
                <p className="text-xs font-medium text-[var(--text-2)]">No notifications yet</p>
                <p className="text-[10px] text-[var(--text-3)] mt-1 leading-relaxed">
                  Alerts appear when signals flip, confidence spikes, or trades close.
                </p>
              </div>
            ) : (
              data.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`px-4 py-3 border-b border-[var(--border)] last:border-0 transition-colors ${
                    !alert.is_read ? "bg-[rgba(255,255,255,0.02)]" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTypeIcon type={alert.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-white leading-snug">{alert.title}</p>
                        {!alert.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                            style={{ background: "var(--gold)" }} />
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-2)] mt-0.5 leading-relaxed">{alert.message}</p>
                      <p className="text-[10px] text-[var(--text-3)] mt-1">{timeAgo(alert.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
