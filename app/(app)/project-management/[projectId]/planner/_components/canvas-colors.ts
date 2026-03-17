/* ─────────────────────── Shared Canvas Color Cache ──────────────────── */

interface CachedColors {
  error: string;
  info: string;
  primary: string;
  warning: string;
  foreground: string;
  mutedFg: string;
  border: string;
  card: string;
  muted: string;
  success: string;
}

function readColors(): CachedColors {
  if (typeof window === "undefined") {
    return {
      error: "#ef4444", info: "#3b82f6", primary: "#171717",
      warning: "#f59e0b", foreground: "#171717", mutedFg: "#737373",
      border: "#e5e5e5", card: "#ffffff", muted: "#f5f5f5",
      success: "#22c55e",
    };
  }
  const s = getComputedStyle(document.documentElement);
  const get = (v: string) => s.getPropertyValue(v).trim() || "#888";
  return {
    error: get("--color-error"),
    info: get("--color-info"),
    primary: get("--primary"),
    warning: get("--color-warning"),
    foreground: get("--foreground"),
    mutedFg: get("--muted-foreground"),
    border: get("--border"),
    card: get("--card"),
    muted: get("--muted"),
    success: get("--color-success"),
  };
}

export { readColors, type CachedColors };
