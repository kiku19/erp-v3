"use client";

import { createContext, useContext, type DragEvent } from "react";
import type { DropPosition } from "@/components/ui/use-tree-drag-drop";

/* ─────────────────────── Actions context (stable, never re-renders) ── */

interface WbsSidebarActions {
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onStartEditing: (id: string) => void;
  onCommitRename: (id: string, newName: string) => void;
  onCancelEditing: () => void;
  onDragStart: (e: DragEvent, id: string) => void;
  onDragOver: (e: DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent, id: string) => void;
  onCycleIcon: (id: string) => void;
  onCycleIconColor: (id: string) => void;
  onToggleVisibility: ((id: string) => void) | undefined;
  onScrollToWbs: ((id: string) => void) | undefined;
}

const WbsSidebarActionsContext = createContext<WbsSidebarActions | null>(null);

/* ─────────────────────── State context (changes on interaction) ────── */

interface WbsSidebarState {
  selectedId: string | null;
  editingId: string | null;
  dragOverId: string | null;
  dropPosition: DropPosition | null;
  hiddenWbsIds: Set<string> | undefined;
}

const WbsSidebarStateContext = createContext<WbsSidebarState | null>(null);

/* ─────────────────────── Hooks ──────────────────────────────────────── */

function useWbsSidebarActions(): WbsSidebarActions {
  const ctx = useContext(WbsSidebarActionsContext);
  if (!ctx) throw new Error("useWbsSidebarActions must be used within WbsSidebarProvider");
  return ctx;
}

function useWbsSidebarState(): WbsSidebarState {
  const ctx = useContext(WbsSidebarStateContext);
  if (!ctx) throw new Error("useWbsSidebarState must be used within WbsSidebarProvider");
  return ctx;
}

export {
  WbsSidebarActionsContext,
  WbsSidebarStateContext,
  useWbsSidebarActions,
  useWbsSidebarState,
};
export type { WbsSidebarActions, WbsSidebarState };
