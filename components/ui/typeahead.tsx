"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
  type KeyboardEvent,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface TypeaheadItem {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface TypeaheadProps {
  items: TypeaheadItem[];
  value?: string;
  onChange?: (item: TypeaheadItem) => void;
  onSearch?: (query: string) => void;
  renderItem?: (item: TypeaheadItem, isHighlighted: boolean) => ReactNode;
  placeholder?: string;
  className?: string;
}

function Typeahead({
  items,
  value,
  onChange,
  onSearch,
  renderItem,
  placeholder = "Search...",
  className,
}: TypeaheadProps) {
  const [query, setQuery] = useState(value ?? "");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  // Keeps dropdown mounted during exit animation
  const [isMounted, setIsMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [listStyle, setListStyle] = useState<CSSProperties>({});

  const filteredItems = useMemo(() => {
    if (!query) return items;
    const lower = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        item.description?.toLowerCase().includes(lower),
    );
  }, [items, query]);

  const showDropdown = isFocused && filteredItems.length > 0;

  // Handle mount/unmount with animation
  useEffect(() => {
    if (showDropdown) {
      setIsClosing(false);
      setIsMounted(true);
    } else if (isMounted) {
      setIsClosing(true);
    }
  }, [showDropdown, isMounted]);

  // Fallback: unmount after exit duration if onAnimationEnd doesn't fire (e.g. jsdom)
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

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      setHighlightedIndex(-1);
      onSearch?.(val);
    },
    [onSearch],
  );

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = useCallback(
    (item: TypeaheadItem) => {
      onChange?.(item);
      setQuery(item.label);
      setHighlightedIndex(-1);
      setIsFocused(false);
      // Blur the input so onFocus can fire again on next click
      inputRef.current?.blur();
    },
    [onChange],
  );

  const updateListPosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setListStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, []);

  const handleFocus = useCallback(() => {
    updateListPosition();
    setIsFocused(true);
  }, [updateListPosition]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    if (listRef.current?.contains(e.relatedTarget as Node)) return;
    setIsFocused(false);
    setHighlightedIndex(-1);
  }, []);

  // Close on scroll so the dropdown doesn't float detached
  useEffect(() => {
    if (!isFocused) return;

    function handleScroll() {
      setIsFocused(false);
      setHighlightedIndex(-1);
    }

    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isFocused]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const count = filteredItems.length;
    if (count === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < count - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : count - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(filteredItems[highlightedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setQuery("");
      setHighlightedIndex(-1);
    }
  };

  const dropdown = isMounted ? (
    <div
      ref={listRef}
      role="listbox"
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onAnimationEnd={handleAnimationEnd}
      style={{
        ...listStyle,
        animation: isClosing
          ? "dropdown-out var(--duration-fast) var(--ease-default) forwards"
          : "dropdown-in var(--duration-normal) var(--ease-default) forwards",
        transformOrigin: "top center",
      }}
      className="rounded-md border border-border bg-background p-1 shadow-[var(--shadow-dropdown)]"
    >
      {filteredItems.map((item, index) => {
        const isHighlighted = highlightedIndex === index;
        return (
          <div
            key={item.id}
            role="option"
            tabIndex={-1}
            aria-selected={isHighlighted}
            onClick={() => handleSelect(item)}
            className={cn(
              "flex cursor-pointer items-center gap-2.5 rounded-[4px] px-3 py-2 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-default)]",
              isHighlighted
                ? "bg-primary-active text-primary-active-foreground"
                : "text-foreground hover:bg-muted-hover",
            )}
          >
            {renderItem ? (
              renderItem(item, isHighlighted)
            ) : (
              <>
                {item.icon && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
                    {item.icon}
                  </span>
                )}
                <div className="flex flex-col gap-0.5">
                  <span
                    className={cn(
                      "text-sm",
                      isHighlighted
                        ? "font-medium text-primary-active-foreground"
                        : "text-foreground",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      <div
        ref={containerRef}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          "w-[320px] rounded-md border border-border bg-background shadow-[var(--shadow-dropdown)]",
          className,
        )}
      >
        {/* Search input area */}
        <div className="flex items-center gap-2 px-3.5 py-2.5">
          <Search size={16} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      {dropdown && createPortal(dropdown, document.body)}
    </>
  );
}

export { Typeahead, type TypeaheadItem, type TypeaheadProps };
