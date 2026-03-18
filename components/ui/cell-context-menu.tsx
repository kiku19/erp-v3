"use client";

import { useRef, useEffect } from "react";
import { createPortal } from "react-dom";

/* ─── Types ────────────────────────────────── */

interface ContextMenuState {
  x: number;
  y: number;
}

interface CellContextMenuProps {
  position: ContextMenuState;
  onFill: () => void;
  onClose: () => void;
}

/* ─── Component ────────────────────────────── */

function CellContextMenu({ position, onFill, onClose }: CellContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: globalThis.MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function handleScroll() {
      onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  useEffect(() => {
    menuRef.current?.focus();
  }, []);

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        zIndex: 9999,
        animation: "dropdown-in var(--duration-normal) var(--ease-default) forwards",
        transformOrigin: "top left",
      }}
      className="w-[160px] rounded-md border border-border bg-background p-1 shadow-[var(--shadow-dropdown)] outline-none"
    >
      <div
        role="menuitem"
        tabIndex={0}
        onClick={() => {
          onFill();
          onClose();
        }}
        className="flex cursor-pointer items-center gap-2 rounded-[4px] px-3 py-2 text-sm text-foreground hover:bg-muted-hover transition-colors duration-[var(--duration-fast)] ease-[var(--ease-default)]"
      >
        <FillIcon />
        <span>Fill</span>
      </div>
    </div>
  );

  return createPortal(menu, document.body);
}

/* ─── Icons ────────────────────────────────── */

function FillIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted-foreground"
    >
      <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" />
      <path d="m5 2 5 5" />
      <path d="M2 13h15" />
      <path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z" />
    </svg>
  );
}

export { CellContextMenu, FillIcon, type ContextMenuState, type CellContextMenuProps };
