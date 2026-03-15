"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Briefcase, Folder, FileText } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { type SearchResults } from "./use-eps-data";

/* ─────────────────────── Types ───────────────────────────────────── */

interface SearchResult {
  id: string;
  name: string;
  path: string;
  type: "eps" | "node" | "project";
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (id: string, type: "eps" | "node" | "project") => void;
  searchFn: (query: string) => Promise<SearchResults>;
}

/* ─────────────────────── Icons ───────────────────────────────────── */

const typeIcons: Record<string, React.ReactNode> = {
  eps: <Briefcase size={14} className="shrink-0 text-info" />,
  node: <Folder size={14} className="shrink-0 text-warning" />,
  project: <FileText size={14} className="shrink-0 text-success" />,
};

const typeBadgeVariant: Record<string, "default" | "secondary" | "warning" | "success"> = {
  eps: "default",
  node: "warning",
  project: "success",
};

/* ─────────────────────── Component ───────────────────────────────── */

function SearchModal({ open, onClose, onSelect, searchFn }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      // Small delay to ensure modal is mounted
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setActiveIndex(0);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await searchFn(query.trim());
        const flat: SearchResult[] = [
          ...data.eps.map((e) => ({ ...e, type: "eps" as const })),
          ...data.nodes.map((n) => ({ ...n, type: "node" as const })),
          ...data.projects.map((p) => ({ ...p, type: "project" as const })),
        ];
        setResults(flat);
        setActiveIndex(0);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchFn]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && results.length > 0) {
        e.preventDefault();
        const selected = results[activeIndex];
        if (selected) {
          onSelect(selected.id, selected.type);
          onClose();
        }
      }
    },
    [results, activeIndex, onSelect, onClose],
  );

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      onSelect(result.id, result.type);
      onClose();
    },
    [onSelect, onClose],
  );

  // Group results by type
  const epsResults = results.filter((r) => r.type === "eps");
  const nodeResults = results.filter((r) => r.type === "node");
  const projectResults = results.filter((r) => r.type === "project");

  // Calculate global index for active highlighting
  let globalIndex = 0;
  const sections: { label: string; items: SearchResult[]; startIndex: number }[] = [];

  if (epsResults.length > 0) {
    sections.push({ label: "EPS", items: epsResults, startIndex: globalIndex });
    globalIndex += epsResults.length;
  }
  if (nodeResults.length > 0) {
    sections.push({ label: "Nodes", items: nodeResults, startIndex: globalIndex });
    globalIndex += nodeResults.length;
  }
  if (projectResults.length > 0) {
    sections.push({ label: "Projects", items: projectResults, startIndex: globalIndex });
  }

  return (
    <Modal open={open} onClose={onClose} width={560}>
      <div className="flex flex-col" data-testid="search-modal">
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search EPS, nodes, projects..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="rounded-[3px] border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {isSearching && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Searching...
            </div>
          )}

          {!isSearching && query.trim() && results.length === 0 && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {!isSearching &&
            sections.map((section) => (
              <div key={section.label}>
                <div className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted">
                  {section.label}
                </div>
                {section.items.map((result, idx) => {
                  const itemGlobalIndex = section.startIndex + idx;
                  return (
                    <button
                      key={result.id}
                      type="button"
                      className={`flex items-center gap-3 w-full px-4 py-2.5 text-left cursor-pointer transition-colors duration-[var(--duration-fast)] ${
                        itemGlobalIndex === activeIndex
                          ? "bg-primary-active text-primary-active-foreground"
                          : "hover:bg-muted-hover"
                      }`}
                      onClick={() => handleResultClick(result)}
                      onMouseEnter={() => setActiveIndex(itemGlobalIndex)}
                    >
                      {typeIcons[result.type]}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {result.name}
                        </span>
                        {result.path && (
                          <span
                            className={`text-[11px] truncate ${
                              itemGlobalIndex === activeIndex
                                ? "text-primary-active-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {result.path}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant={typeBadgeVariant[result.type]}
                        className="shrink-0"
                      >
                        {result.type}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            ))}
        </div>

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 border-t border-border">
            <div className="flex items-center gap-1">
              <kbd className="rounded-[3px] border border-border bg-muted px-1 py-px text-[9px] font-medium text-muted-foreground">
                ↑↓
              </kbd>
              <span className="text-[10px] text-muted-foreground">navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="rounded-[3px] border border-border bg-muted px-1 py-px text-[9px] font-medium text-muted-foreground">
                ↵
              </kbd>
              <span className="text-[10px] text-muted-foreground">select</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export { SearchModal, type SearchModalProps };
