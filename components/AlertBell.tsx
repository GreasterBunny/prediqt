"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Alert } from "@/services/alerts";

interface AlertsResponse {
  alerts: Alert[];
  unreadCount: number;
}

const ALERT_ICONS: Record<string, string> = {
  prediction_flip: "🔄",
  high_confidence: "⚡",
  trade_closed: "💼",
  system: "🔔",
};

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
      if (res.ok) {
        const json = await res.json() as AlertsResponse;
        setData(json);
      }
    } catch {
      // silent
    }
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpen() {
    setOpen((o) => !o);
    if (!open && data.unreadCount > 0) {
      // Mark all read
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
        {/* Bell icon */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 1a5 5 0 0 0-5 5v2.5l-1 1.5h12l-1-1.5V6a5 5 0 0 0-5-5Z"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--text-2)]"
          />
          <path
            d="M6.5 12.5a1.5 1.5 0 0 0 3 0"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            className="text-[var(--text-2)]"
          />
        </svg>
        {/* Badge */}
        {data.unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 flex items-center justify-center rounded-full text-[9px] font-bold text-white px-0.5"
            style={{ background: "var(--green)" }}>
            {data.unreadCount > 9 ? "9+" : data.unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-10 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-mid)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          }}
        >
          {/* Header */}
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

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {data.alerts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-xs text-[var(--text-3)]">No notifications yet</p>
                <p className="text-[10px] text-[var(--text-3)] mt-1">
                  Alerts appear when signals flip, confidence spikes, or trades close.
                </p>
              </div>
            ) : (
              data.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`px-4 py-3 border-b border-[var(--border)] last:border-0 transition-colors ${
                    !alert.is_read ? "bg-[rgba(34,197,94,0.04)]" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-base mt-0.5 flex-shrink-0">
                      {ALERT_ICONS[alert.type] ?? "🔔"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-white leading-snug">{alert.title}</p>
                        {!alert.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                            style={{ background: "var(--green)" }} />
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
