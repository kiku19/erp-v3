"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ─────────────────────── Types ───────────────────────────────────── */

interface SpotlightSearchItem {
  id: string;
}

interface SpotlightSearchProps<T extends SpotlightSearchItem> {
  open: boolean;
  onClose: () => void;
  placeholder: string;
  items: T[];
  onSelect: (item: T) => void;
  renderItem: (item: T, isActive: boolean) => ReactNode;
  filterFn?: (item: T, query: string) => boolean;
  emptyLabel?: string;
  noResultsLabel?: string;
}

/* ─────────────────────── Component ───────────────────────────────── */

function SpotlightSearch<T extends SpotlightSearchItem>({
  open,
  onClose,
  placeholder,
  items,
  onSelect,
  renderItem,
  filterFn,
  emptyLabel = "Recently Added",
  noResultsLabel = "No results for",
}: SpotlightSearchProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Mount / unmount animation
  useEffect(() => {
    if (open) {
      setIsClosing(false);
      setIsMounted(true);
      setQuery("");
      setActiveIndex(0);
    } else if (isMounted) {
      setIsClosing(true);
    }
  }, [open, isMounted]);

  // Fallback unmount (jsdom doesn't fire onAnimationEnd)
  useEffect(() => {
    if (!isClosing) return;
    const timer = setTimeout(() => {
      setIsMounted(false);
      setIsClosing(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [isClosing]);

  const handleAnimationEnd = useCallback(() => {
    if (isClosing) {
      setIsMounted(false);
      setIsClosing(false);
    }
  }, [isClosing]);

  // Auto-focus input on mount
  useEffect(() => {
    if (isMounted && !isClosing) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isMounted, isClosing]);

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const filtered = useMemo(() => {
    if (!query.trim() || !filterFn) return items;
    return items.filter((item) => filterFn(item, query));
  }, [items, query, filterFn]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filtered.length) % Math.max(filtered.length, 1));
      } else if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        onSelect(filtered[activeIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [filtered, activeIndex, onSelect, onClose],
  );

  // Close on Escape at document level
  useEffect(() => {
    if (!isMounted || isClosing) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", handleEsc, true);
    return () => document.removeEventListener("keydown", handleEsc, true);
  }, [isMounted, isClosing, onClose]);

  if (!isMounted) return null;

  const animStyle = {
    animation: isClosing
      ? "spotlight-out var(--duration-fast) var(--ease-default) forwards"
      : "spotlight-in var(--duration-normal) var(--ease-default) forwards",
  };

  return createPortal(
    <div
      data-testid="spotlight-backdrop"
      className="fixed inset-0 bg-foreground/20 backdrop-blur-sm"
      style={{ zIndex: 99999, ...animStyle }}
      onClick={onClose}
      onAnimationEnd={handleAnimationEnd}
    >
      <div
        data-testid="spotlight-search"
        className="mx-auto mt-[20vh] w-full max-w-[560px] rounded-lg border border-border bg-card shadow-[var(--shadow-dropdown)]"
        onClick={(e) => e.stopPropagation()}
        style={animStyle}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 h-12 px-4 border-b border-border">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            data-testid="spotlight-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="border-none bg-transparent shadow-none ring-0 ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-0 h-auto"
          />
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-auto p-2">
          {query.trim() && filtered.length === 0 && (
            <p className="text-[13px] text-muted-foreground text-center py-4">
              {noResultsLabel} &ldquo;{query}&rdquo;
            </p>
          )}

          {!query.trim() && items.length === 0 && (
            <p className="text-[13px] text-muted-foreground text-center py-4">
              No items added yet
            </p>
          )}

          {!query.trim() && items.length > 0 && (
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {emptyLabel}
            </div>
          )}

          {filtered.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              data-testid={`spotlight-item-${item.id}`}
              className={cn(
                "flex w-full items-center px-3 py-2.5 rounded-md text-left cursor-pointer transition-colors duration-[var(--duration-fast)]",
                idx === activeIndex
                  ? "bg-primary-active text-primary-active-foreground"
                  : "hover:bg-muted-hover",
              )}
              onClick={() => onSelect(item)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              {renderItem(item, idx === activeIndex)}
            </button>
          ))}
        </div>

        {/* Footer hint */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-4 border-t border-border px-4 py-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <kbd className="rounded-[3px] border border-border bg-muted px-1 py-px text-[9px] font-medium">
                ↑↓
              </kbd>
              <span className="text-[10px]">navigate</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <kbd className="rounded-[3px] border border-border bg-muted px-1 py-px text-[9px] font-medium">
                ↵
              </kbd>
              <span className="text-[10px]">select</span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ─────────────────────── Exports ─────────────────────────────────── */

export {
  SpotlightSearch,
  type SpotlightSearchProps,
  type SpotlightSearchItem,
};
