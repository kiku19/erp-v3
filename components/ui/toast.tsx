"use client";

import {
  useState,
  useEffect,
  useCallback,
  useContext,
  createContext,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  X,
  TriangleAlert,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";

/* ─────────────────────── Types ───────────────────────────────────── */

type ToastVariant = "success" | "warning" | "error" | "info";

interface ToastData {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastOptions {
  variant: ToastVariant;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

/* ─────────────────────── Styling maps ────────────────────────────── */

const variantStyles: Record<ToastVariant, string> = {
  warning: "bg-warning-bg border-warning",
  success: "bg-success-bg border-success",
  error: "bg-error-bg border-error",
  info: "bg-info-bg border-info",
};

const iconMap: Record<ToastVariant, ReactNode> = {
  warning: <TriangleAlert size={18} className="shrink-0 text-warning" />,
  success: <CheckCircle2 size={18} className="shrink-0 text-success" />,
  error: <XCircle size={18} className="shrink-0 text-error" />,
  info: <Info size={18} className="shrink-0 text-info" />,
};

/* ─────────────────────── Context ─────────────────────────────────── */

const ToastContext = createContext<ToastContextValue | null>(null);

function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

/* ─────────────────────── Single toast item ────────────────────────── */

function ToastItem({
  data,
  onDismiss,
}: {
  data: ToastData;
  onDismiss: (id: string) => void;
}) {
  const [isClosing, setIsClosing] = useState(false);

  // Auto-dismiss
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
    }, data.duration ?? 5000);
    return () => clearTimeout(timer);
  }, [data.duration]);

  // Remove from list after closing animation
  useEffect(() => {
    if (!isClosing) return;
    const timer = setTimeout(() => {
      onDismiss(data.id);
    }, 150);
    return () => clearTimeout(timer);
  }, [isClosing, data.id, onDismiss]);

  const handleClose = () => {
    setIsClosing(true);
  };

  return (
    <div
      data-toast
      className={cn(
        "flex items-start gap-3 rounded-md border px-4 py-3 shadow-[var(--shadow-dropdown)]",
        "border-l-[3px]",
        variantStyles[data.variant],
      )}
      style={{
        width: 380,
        animation: isClosing
          ? "dropdown-out var(--duration-fast) var(--ease-default) forwards"
          : "dropdown-in var(--duration-normal) var(--ease-default) forwards",
      }}
    >
      {iconMap[data.variant]}
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-[13px] font-semibold text-foreground">
          {data.title}
        </span>
        {data.message && (
          <span className="text-[12px] text-muted-foreground">
            {data.message}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={handleClose}
        aria-label="Dismiss toast"
        className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer transition-colors duration-[var(--duration-fast)]"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* ─────────────────────── Provider ────────────────────────────────── */

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...options, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const container =
    mounted && toasts.length > 0
      ? createPortal(
          <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2">
            {toasts.map((t) => (
              <ToastItem key={t.id} data={t} onDismiss={dismiss} />
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {container}
    </ToastContext.Provider>
  );
}

/* ─────────────────────── Exports ─────────────────────────────────── */

export {
  ToastProvider,
  useToast,
  type ToastVariant,
  type ToastData,
  type ToastOptions,
};
