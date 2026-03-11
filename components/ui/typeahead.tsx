"use client";

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
  type KeyboardEvent,
} from "react";
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
  placeholder?: string;
  className?: string;
}

function Typeahead({
  items,
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  className,
}: TypeaheadProps) {
  const [query, setQuery] = useState(value ?? "");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    if (!query) return items;
    const lower = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        item.description?.toLowerCase().includes(lower),
    );
  }, [items, query]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      setHighlightedIndex(-1);
      onSearch?.(val);
    },
    [onSearch],
  );

  const handleSelect = useCallback(
    (item: TypeaheadItem) => {
      onChange?.(item);
      setQuery("");
      setHighlightedIndex(-1);
    },
    [onChange],
  );

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

  return (
    <div
      onKeyDown={handleKeyDown}
      className={cn(
        "w-[320px] rounded-md border border-border bg-background shadow-[0_4px_12px_-2px_rgba(0,0,0,0.1)]",
        className,
      )}
    >
      {/* Search input area */}
      <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
        <Search size={16} className="shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Suggestions list */}
      <div ref={listRef} role="listbox" className="p-1">
        {filteredItems.map((item, index) => (
          <div
            key={item.id}
            role="option"
            aria-selected={highlightedIndex === index}
            onClick={() => handleSelect(item)}
            className={cn(
              "flex cursor-pointer items-center gap-2.5 rounded-[4px] px-3 py-2 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-default)]",
              highlightedIndex === index
                ? "bg-accent text-accent-foreground"
                : "text-foreground hover:bg-muted-hover",
            )}
          >
            {item.icon && (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
                {item.icon}
              </span>
            )}
            <div className="flex flex-col gap-0.5">
              <span
                className={cn(
                  "text-sm",
                  highlightedIndex === index
                    ? "font-medium text-accent-foreground"
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
          </div>
        ))}
      </div>
    </div>
  );
}

export { Typeahead, type TypeaheadItem, type TypeaheadProps };
