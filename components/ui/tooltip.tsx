"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  side?: "top" | "right" | "bottom" | "left";
  delay?: number;
  children: ReactNode;
  className?: string;
}

function Tooltip({
  content,
  side = "right",
  delay = 200,
  children,
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (!content) return;
    timerRef.current = setTimeout(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const offset = 8;

      let top = 0;
      let left = 0;

      switch (side) {
        case "right":
          top = rect.top + rect.height / 2;
          left = rect.right + offset;
          break;
        case "left":
          top = rect.top + rect.height / 2;
          left = rect.left - offset;
          break;
        case "top":
          top = rect.top - offset;
          left = rect.left + rect.width / 2;
          break;
        case "bottom":
          top = rect.bottom + offset;
          left = rect.left + rect.width / 2;
          break;
      }

      setPos({ top, left });
      setVisible(true);
    }, delay);
  }, [content, side, delay]);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, []);

  const translateClass =
    side === "right" || side === "left"
      ? "-translate-y-1/2"
      : "-translate-x-1/2";

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="inline-flex"
      >
        {children}
      </div>
      {visible &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            className={cn(
              "fixed z-50 whitespace-nowrap rounded-[var(--radius-sm)] bg-primary px-2 py-1 text-xs text-primary-foreground shadow-[var(--shadow-dropdown)] animate-tooltip-in pointer-events-none",
              translateClass,
              className,
            )}
            style={{ top: pos.top, left: pos.left }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}

export { Tooltip, type TooltipProps };
