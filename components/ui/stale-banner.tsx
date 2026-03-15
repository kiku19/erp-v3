"use client";

import { useState, useEffect } from "react";
import { Cloud, CloudOff, Check, Loader2, AlertTriangle, RefreshCw } from "lucide-react";

/* ─────────────────────── Types ───────────────────────────────────── */

type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline" | "stale";

interface AutosaveIndicatorProps {
  status: SaveStatus;
  lastSavedAt?: Date | null;
  pendingCount?: number;
  onReload?: () => void;
}

/* ─────────────────────── Helpers ──────────────────────────────────── */

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

/* ─────────────────────── Component ───────────────────────────────── */

function AutosaveIndicator({ status, lastSavedAt, pendingCount = 0, onReload }: AutosaveIndicatorProps) {
  // Re-render every 10s to keep relative time fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastSavedAt) return;
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, [lastSavedAt]);

  const configs: Record<SaveStatus, {
    icon: typeof Cloud;
    label: string;
    color: string;
    iconClass?: string;
  }> = {
    idle: {
      icon: Cloud,
      label: lastSavedAt ? `Saved ${formatTimeAgo(lastSavedAt)}` : "All changes saved",
      color: "text-muted-foreground",
    },
    saving: {
      icon: Loader2,
      label: "Saving...",
      color: "text-muted-foreground",
      iconClass: "animate-spin",
    },
    saved: {
      icon: Check,
      label: lastSavedAt ? `Saved ${formatTimeAgo(lastSavedAt)}` : "Saved",
      color: "text-success",
    },
    error: {
      icon: AlertTriangle,
      label: "Save failed",
      color: "text-destructive",
    },
    offline: {
      icon: CloudOff,
      label: pendingCount > 0
        ? `Offline · ${pendingCount} change${pendingCount > 1 ? "s" : ""} queued`
        : "Offline",
      color: "text-warning",
    },
    stale: {
      icon: RefreshCw,
      label: "Updated externally",
      color: "text-warning",
    },
  };

  const config = configs[status];
  const Icon = config.icon;
  const isClickable = status === "stale" && onReload;

  return (
    <div
      data-testid="autosave-indicator"
      className={`flex items-center gap-1.5 ${config.color} ${isClickable ? "cursor-pointer hover:underline" : ""}`}
      onClick={isClickable ? onReload : undefined}
      role={isClickable ? "button" : undefined}
    >
      <Icon size={12} className={config.iconClass ?? ""} />
      <span className="text-[11px] font-medium">
        {config.label}
      </span>
      {isClickable && (
        <span className="text-[10px] opacity-70">· click to reload</span>
      )}
    </div>
  );
}

export {
  AutosaveIndicator,
  type AutosaveIndicatorProps,
  type SaveStatus,
};
