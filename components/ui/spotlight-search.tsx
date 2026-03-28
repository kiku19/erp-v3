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
import { Search, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  mode?: "single" | "multi";
  onConfirm?: (items: T[]) => void;
  renderSelectedItem?: (item: T) => ReactNode;
  /** Server-side search — when provided, replaces client-side filterFn. Called with debounced query. */
  onSearch?: (query: string) => Promise<T[]>;
  /** Debounce delay in ms for onSearch (default 300) */
  searchDebounceMs?: number;
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
  mode = "single",
  onConfirm,
  renderSelectedItem,
  onSearch,
  searchDebounceMs = 300,
}: SpotlightSearchProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [selected, setSelected] = useState<T[]>([]);
  const [searchResults, setSearchResults] = useState<T[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isMulti = mode === "multi";
  const useServerSearch = !!onSearch;
  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

  // Mount / unmount animation
  useEffect(() => {
    if (open) {
      setIsClosing(false);
      setIsMounted(true);
      setQuery("");
      setActiveIndex(0);
      setSelected([]);
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

  // Debounced server-side search
  useEffect(() => {
    if (!useServerSearch) return;
    clearTimeout(searchDebounceRef.current);

    if (!query.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await onSearch!(query);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, searchDebounceMs);

    return () => clearTimeout(searchDebounceRef.current);
  }, [query, useServerSearch, onSearch, searchDebounceMs]);

  // Reset search results when modal closes
  useEffect(() => {
    if (!open) {
      setSearchResults(null);
      setIsSearching(false);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (useServerSearch) {
      return searchResults ?? items;
    }
    if (!query.trim() || !filterFn) return items;
    return items.filter((item) => filterFn(item, query));
  }, [items, query, filterFn, useServerSearch, searchResults]);

  const toggleSelection = useCallback(
    (item: T) => {
      setSelected((prev) => {
        const exists = prev.some((s) => s.id === item.id);
        if (exists) return prev.filter((s) => s.id !== item.id);
        return [...prev, item];
      });
    },
    [],
  );

  const removeFromSelection = useCallback(
    (itemId: string) => {
      setSelected((prev) => prev.filter((s) => s.id !== itemId));
    },
    [],
  );

  const handleItemClick = useCallback(
    (item: T) => {
      if (isMulti) {
        toggleSelection(item);
      } else {
        onSelect(item);
      }
    },
    [isMulti, toggleSelection, onSelect],
  );

  const handleConfirm = useCallback(() => {
    onConfirm?.(selected);
  }, [onConfirm, selected]);

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
        if (isMulti) {
          toggleSelection(filtered[activeIndex]);
        } else {
          onSelect(filtered[activeIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [filtered, activeIndex, onSelect, onClose, isMulti, toggleSelection],
  );

  // Global keyboard capture — Escape closes, alphanumeric goes to input
  useEffect(() => {
    if (!isMounted || isClosing) return;
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      // Forward printable characters to input if it's not already focused
      if (
        document.activeElement !== inputRef.current &&
        e.key.length === 1 &&
        !e.ctrlKey && !e.metaKey && !e.altKey
      ) {
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown, true);
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
        className={cn(
          "mx-auto mt-[10vh] w-full h-[80vh] rounded-lg border border-border bg-card shadow-[var(--shadow-dropdown)]",
          isMulti ? "max-w-[860px] flex" : "max-w-[560px] flex flex-col",
        )}
        onClick={(e) => e.stopPropagation()}
        style={animStyle}
      >
        {/* Left panel — search + results */}
        <div className={cn("flex flex-col flex-1 min-w-0")}>
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
          <div className="flex-1 overflow-auto p-2">
            {isSearching && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-muted-foreground animate-spin">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="80 40" />
                </svg>
                <span className="text-[13px] text-muted-foreground">Searching…</span>
              </div>
            )}

            {!isSearching && query.trim() && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="text-muted-foreground/50">
                  <circle cx="28" cy="28" r="16" stroke="currentColor" strokeWidth="2.5" />
                  <line x1="39.5" y1="39.5" x2="52" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="22" y1="28" x2="34" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="text-[13px] text-muted-foreground">
                  {noResultsLabel} &ldquo;{query}&rdquo;
                </span>
              </div>
            )}

            {!isSearching && !query.trim() && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="text-muted-foreground/50">
                  <circle cx="28" cy="28" r="16" stroke="currentColor" strokeWidth="2.5" />
                  <line x1="39.5" y1="39.5" x2="52" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <span className="text-[13px] text-muted-foreground">
                  Type to search
                </span>
              </div>
            )}

            {!isSearching && !query.trim() && filtered.length > 0 && (
              <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {emptyLabel}
              </div>
            )}

            {!isSearching && filtered.map((item, idx) => {
              const isSelected = isMulti && selectedIds.has(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`spotlight-item-${item.id}`}
                  className={cn(
                    "flex w-full items-center px-3 py-2.5 rounded-md text-left cursor-pointer transition-colors duration-[var(--duration-normal)]",
                    idx === activeIndex
                      ? "bg-muted"
                      : isSelected
                        ? "bg-success-bg text-success-foreground"
                        : "hover:bg-muted-hover",
                  )}
                  onClick={() => handleItemClick(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <div className="flex-1 min-w-0">
                    {renderItem(item, idx === activeIndex)}
                  </div>
                  {isSelected && (
                    <Check
                      size={14}
                      data-testid={`spotlight-check-${item.id}`}
                      className={cn(
                        "shrink-0 ml-2",
                        "text-success-foreground",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-4 border-t border-border px-4 py-2 shrink-0">
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
                <span className="text-[10px]">{isMulti ? "toggle" : "select"}</span>
              </div>
              {isMulti && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <kbd className="rounded-[3px] border border-border bg-muted px-1 py-px text-[9px] font-medium">
                    ⏎
                  </kbd>
                  <span className="text-[10px]">confirm</span>
                </div>
              )}
          </div>
        </div>

        {/* Right panel — selection (multi mode only) */}
        {isMulti && (
          <div
            data-testid="spotlight-selection-panel"
            className="w-[280px] border-l border-border flex flex-col"
          >
            {/* Selection header */}
            <div className="flex items-center justify-between h-12 px-4 border-b border-border shrink-0">
              <span className="text-[13px] font-semibold text-foreground">
                Selected ({selected.length})
              </span>
            </div>

            {/* Selected items */}
            <div className="flex-1 min-h-0 overflow-auto p-2">
              {selected.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-muted-foreground/40">
                    <rect x="8" y="12" width="32" height="24" rx="3" stroke="currentColor" strokeWidth="2" />
                    <line x1="16" y1="20" x2="32" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="16" y1="26" x2="28" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="16" y1="32" x2="24" y2="32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span className="text-[12px] text-muted-foreground">Click items to select</span>
                </div>
              ) : (
                selected.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2 rounded-md group"
                  >
                    <div className="flex-1 min-w-0 text-[13px]">
                      {renderSelectedItem ? renderSelectedItem(item) : renderItem(item, false)}
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${(item as Record<string, unknown>).name ?? item.id}`}
                      className="shrink-0 ml-2 h-5 w-5 flex items-center justify-center rounded text-destructive hover:text-destructive-hover cursor-pointer transition-colors duration-[var(--duration-fast)]"
                      onClick={() => removeFromSelection(item.id)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Confirm / Cancel */}
            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                data-testid="spotlight-cancel-btn"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                data-testid="spotlight-confirm-btn"
                onClick={handleConfirm}
                disabled={selected.length === 0}
              >
                Confirm ({selected.length})
              </Button>
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
