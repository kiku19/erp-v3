"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type DragEvent,
} from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Search,
  UserPlus,
} from "lucide-react";
import { useTreeDragDrop } from "./use-tree-drag-drop";

/* ─────────────────────── Types ───────────────────────────────────── */

type DropPosition = "before" | "inside" | "after";

type NodeColor = "accent" | "info" | "warning" | "success" | "error";

interface TreeNodeData {
  id: string;
  name: string;
  initials?: string;
  icon?: ReactNode;
  role?: string;
  roleColor?: NodeColor;
  badge?: { label: string; color: NodeColor };
  expanded?: boolean;
  children?: TreeNodeData[];
}

interface ShortcutItem {
  key: string;
  label: string;
}

interface StatItem {
  label: string;
  value: number;
  color?: "success" | "warning" | "error" | "info";
}

/* ─────────────────────── Color maps ──────────────────────────────── */

const roleColorMap: Record<NodeColor, string> = {
  accent: "text-accent-foreground",
  info: "text-info",
  warning: "text-warning",
  success: "text-success",
  error: "text-destructive",
};

const statColorMap: Record<string, string> = {
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
  info: "text-info",
};

/* ─────────────────────── Tree helpers ────────────────────────────── */

function toggleNodeById(
  nodes: TreeNodeData[],
  id: string,
): TreeNodeData[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return { ...node, expanded: !node.expanded };
    }
    if (node.children) {
      return { ...node, children: toggleNodeById(node.children, id) };
    }
    return node;
  });
}

function expandNodeById(
  nodes: TreeNodeData[],
  id: string,
): TreeNodeData[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return { ...node, expanded: true };
    }
    if (node.children) {
      return { ...node, children: expandNodeById(node.children, id) };
    }
    return node;
  });
}

function renameNodeById(
  nodes: TreeNodeData[],
  id: string,
  newName: string,
): TreeNodeData[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return { ...node, name: newName };
    }
    if (node.children) {
      return { ...node, children: renameNodeById(node.children, id, newName) };
    }
    return node;
  });
}

function addChildToNode(
  nodes: TreeNodeData[],
  parentId: string,
  child: TreeNodeData,
): TreeNodeData[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        expanded: true,
        children: [...(node.children ?? []), child],
      };
    }
    if (node.children) {
      return { ...node, children: addChildToNode(node.children, parentId, child) };
    }
    return node;
  });
}

function removeNodeById(
  nodes: TreeNodeData[],
  id: string,
): { nodes: TreeNodeData[]; removed: TreeNodeData | null } {
  let removed: TreeNodeData | null = null;
  const result = nodes.reduce<TreeNodeData[]>((acc, node) => {
    if (node.id === id) {
      removed = node;
      return acc;
    }
    if (node.children) {
      const childResult = removeNodeById(node.children, id);
      if (childResult.removed) removed = childResult.removed;
      acc.push({ ...node, children: childResult.nodes });
    } else {
      acc.push(node);
    }
    return acc;
  }, []);
  return { nodes: result, removed };
}

function insertNodeNear(
  nodes: TreeNodeData[],
  targetId: string,
  nodeToInsert: TreeNodeData,
  position: "before" | "after",
): TreeNodeData[] {
  const result: TreeNodeData[] = [];
  for (const node of nodes) {
    if (node.id === targetId) {
      if (position === "before") {
        result.push(nodeToInsert, node);
      } else {
        result.push(node, nodeToInsert);
      }
    } else if (node.children) {
      result.push({
        ...node,
        children: insertNodeNear(node.children, targetId, nodeToInsert, position),
      });
    } else {
      result.push(node);
    }
  }
  return result;
}

function hasDescendant(node: TreeNodeData, targetId: string): boolean {
  if (!node.children) return false;
  for (const child of node.children) {
    if (child.id === targetId) return true;
    if (hasDescendant(child, targetId)) return true;
  }
  return false;
}

function isDescendantOf(
  nodes: TreeNodeData[],
  parentId: string,
  childId: string,
): boolean {
  for (const node of nodes) {
    if (node.id === parentId) {
      return hasDescendant(node, childId);
    }
    if (node.children && isDescendantOf(node.children, parentId, childId)) {
      return true;
    }
  }
  return false;
}

function findNodeById(
  nodes: TreeNodeData[],
  id: string,
): TreeNodeData | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNodeById(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

function generateInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

/* ─────────────────────── Tree (container) ─────────────────────── */

interface TreeProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const Tree = forwardRef<HTMLDivElement, TreeProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col bg-card border-r border-border",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Tree.displayName = "Tree";

/* ─────────────────────── TreeHeader ───────────────────────────── */

interface TreeHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  onAddPerson?: () => void;
}

function TreeHeader({
  title,
  onAddPerson,
  className,
  ...props
}: TreeHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between h-11 px-4 border-b border-border",
        className,
      )}
      {...props}
    >
      <span className="text-[13px] font-semibold text-foreground">{title}</span>
      <div className="flex items-center gap-1">
        {onAddPerson && (
          <button
            data-testid="tree-add-person"
            type="button"
            className="flex items-center justify-center h-[30px] w-[30px] rounded-md border border-border bg-background text-muted-foreground hover:bg-muted-hover cursor-pointer transition-colors duration-[var(--duration-fast)]"
            onClick={onAddPerson}
            aria-label="Add person"
          >
            <UserPlus size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── TreeSearch ───────────────────────────── */

interface TreeSearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  "data-testid"?: string;
}

function TreeSearch({
  className,
  "data-testid": testId,
  ...props
}: TreeSearchProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "flex items-center gap-2 h-9 px-3 border-b border-border",
        className,
      )}
    >
      <Search size={14} className="shrink-0 text-muted-foreground" />
      <input
        type="text"
        className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none"
        {...props}
      />
    </div>
  );
}

/* ─────────────────────── TreeContent ──────────────────────────── */

interface TreeContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

function TreeContent({ children, className, ...props }: TreeContentProps) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto py-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* ─────────────────────── Inline rename input ─────────────────────── */

function RenameInput({
  defaultValue,
  onSubmit,
  onCancel,
}: {
  defaultValue: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = inputRef.current?.value.trim();
      if (val) onSubmit(val);
      else onCancel();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      data-testid="tree-rename-input"
      type="text"
      defaultValue={defaultValue}
      className="flex-1 min-w-0 bg-background border border-input rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onKeyDown={handleKeyDown}
      onBlur={onCancel}
    />
  );
}

/* ─────────────────────── Add-child input ─────────────────────────── */

function AddChildInput({
  level,
  onSubmit,
  onCancel,
}: {
  level: number;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const paddingLeft = 12 + (level + 1) * 16;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = inputRef.current?.value.trim();
      if (val) onSubmit(val);
      else onCancel();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className="flex items-center gap-1.5"
      style={{ paddingLeft, paddingRight: 12, paddingTop: 4, paddingBottom: 4 }}
    >
      <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-muted overflow-hidden">
        <UserPlus size={10} className="text-muted-foreground" />
      </div>
      <input
        ref={inputRef}
        data-testid="tree-add-child-input"
        type="text"
        placeholder="Enter person name..."
        className="flex-1 min-w-0 bg-background border border-input rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
      />
    </div>
  );
}

/* ─────────────────────── TreeNode ─────────────────────────────── */

interface TreeNodeProps extends Omit<HTMLAttributes<HTMLDivElement>, "onClick" | "onDoubleClick" | "onToggle"> {
  node: TreeNodeData;
  level: number;
  active?: boolean;
  draggable?: boolean;
  renaming?: boolean;
  addingChild?: boolean;
  addingAfter?: boolean;
  onAddAfterSubmit?: (name: string) => void;
  onAddAfterCancel?: () => void;
  dragOver?: boolean;
  dropPosition?: DropPosition;
  onToggle?: (id: string) => void;
  onClick?: (id: string) => void;
  onDoubleClick?: (id: string) => void;
  onRenameSubmit?: (id: string, newName: string) => void;
  onRenameCancel?: () => void;
  onAddChildSubmit?: (parentId: string, name: string) => void;
  onAddChildCancel?: () => void;
  onNodeDragStart?: (e: DragEvent, id: string) => void;
  onNodeDragOver?: (e: DragEvent, id: string) => void;
  onNodeDragLeave?: (e: DragEvent, id: string) => void;
  onNodeDrop?: (e: DragEvent, id: string) => void;
  children?: ReactNode;
  "data-testid"?: string;
}

function TreeNode({
  node,
  level,
  active = false,
  draggable: isDraggable = false,
  renaming = false,
  addingChild = false,
  addingAfter = false,
  onAddAfterSubmit,
  onAddAfterCancel,
  dragOver = false,
  dropPosition = "inside",
  onToggle,
  onClick,
  onDoubleClick,
  onRenameSubmit,
  onRenameCancel,
  onAddChildSubmit,
  onAddChildCancel,
  onNodeDragStart,
  onNodeDragOver,
  onNodeDragLeave,
  onNodeDrop,
  children,
  className,
  "data-testid": testId,
  ...props
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const paddingLeft = 12 + level * 16;

  return (
    <>
      <div
        data-testid={testId}
        className={cn(
          "relative flex items-center gap-1.5 rounded-[var(--radius-sm)] cursor-pointer transition-colors duration-[var(--duration-fast)]",
          active && !(dragOver && dropPosition === "inside") && "bg-primary-active text-primary-active-foreground",
          dragOver && dropPosition === "inside" && "ring-2 ring-ring bg-muted",
          !active && !(dragOver && dropPosition === "inside") && "hover:bg-muted-hover",
          className,
        )}
        style={{ paddingLeft, paddingRight: 12, paddingTop: 5, paddingBottom: 5 }}
        onClick={() => onClick?.(node.id)}
        onDoubleClick={() => onDoubleClick?.(node.id)}
        role="treeitem"
        aria-expanded={hasChildren ? node.expanded : undefined}
        draggable={isDraggable}
        onDragStart={(e) => onNodeDragStart?.(e, node.id)}
        onDragOver={(e) => onNodeDragOver?.(e, node.id)}
        onDragLeave={(e) => onNodeDragLeave?.(e, node.id)}
        onDrop={(e) => onNodeDrop?.(e, node.id)}
        {...props}
      >
        {/* Drop position line indicators */}
        {dragOver && dropPosition === "before" && (
          <div
            data-testid="drop-line-before"
            className="absolute top-0 left-2 right-2 h-0.5 bg-primary rounded-full pointer-events-none"
          />
        )}
        {dragOver && dropPosition === "after" && (
          <div
            data-testid="drop-line-after"
            className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full pointer-events-none"
          />
        )}

        {/* Drag handle */}
        {isDraggable && (
          <span
            data-testid={`tree-drag-${node.id}`}
            className={cn(
              "shrink-0 opacity-40",
              active ? "text-primary-active-foreground" : "text-muted-foreground",
            )}
          >
            <GripVertical size={12} />
          </span>
        )}

        {/* Chevron — shown only when node has children */}
        {hasChildren && (
          <button
            data-testid={`tree-chevron-${node.id}`}
            type="button"
            className={cn(
              "shrink-0 cursor-pointer",
              active ? "text-primary-active-foreground" : "text-muted-foreground",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.(node.id);
            }}
            aria-label={node.expanded ? "Collapse" : "Expand"}
          >
            {node.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}

        {/* Icon (takes precedence over avatar) */}
        {node.icon ? (
          <span className="shrink-0">{node.icon}</span>
        ) : node.initials ? (
          <div
            className={cn(
              "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full overflow-hidden",
              active ? "bg-primary-active-foreground" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "text-[9px] font-semibold",
                active ? "text-primary-active" : "text-muted-foreground",
              )}
            >
              {node.initials}
            </span>
          </div>
        ) : null}

        {/* Name — or rename input */}
        {renaming ? (
          <RenameInput
            defaultValue={node.name}
            onSubmit={(val) => onRenameSubmit?.(node.id, val)}
            onCancel={() => onRenameCancel?.()}
          />
        ) : (
          <span
            className={cn(
              "text-[13px] truncate",
              active ? "text-primary-active-foreground" : "text-foreground",
              hasChildren ? "font-medium" : "font-normal",
            )}
          >
            {node.name}
          </span>
        )}

        {/* Role / designation */}
        {!renaming && node.role && (
          <span
            className={cn(
              "text-[11px] shrink-0",
              active
                ? "text-primary-active-foreground opacity-80"
                : node.roleColor ? roleColorMap[node.roleColor] : "text-muted-foreground",
            )}
          >
            {node.role}
          </span>
        )}

        {/* Badge (e.g. "Active" status) */}
        {!renaming && node.badge && (
          <span
            data-badge
            className={cn(
              "ml-auto shrink-0 rounded-full px-3 py-0.5 text-[10px] font-medium",
              node.badge.color === "success" && "bg-success-bg text-success",
              node.badge.color === "warning" && "bg-warning-bg text-warning",
              node.badge.color === "error" && "bg-error-bg text-destructive",
              node.badge.color === "info" && "bg-info-bg text-info",
              node.badge.color === "accent" && "bg-muted text-accent-foreground",
            )}
          >
            {node.badge.label}
          </span>
        )}
      </div>

      {/* Add-after input (sibling, same level) */}
      {addingAfter && (
        <AddChildInput
          level={level}
          onSubmit={(name) => onAddAfterSubmit?.(name)}
          onCancel={() => onAddAfterCancel?.()}
        />
      )}

      {/* Children (expanded) */}
      {children}

      {/* Add-child input (as child, indented) */}
      {addingChild && (
        <AddChildInput
          level={level}
          onSubmit={(name) => onAddChildSubmit?.(node.id, name)}
          onCancel={() => onAddChildCancel?.()}
        />
      )}
    </>
  );
}

/* ─────────────────────── TreeShortcuts ────────────────────────── */

interface TreeShortcutsProps extends HTMLAttributes<HTMLDivElement> {
  shortcuts: ShortcutItem[];
}

function TreeShortcuts({
  shortcuts,
  className,
  ...props
}: TreeShortcutsProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 bg-muted px-3 py-1.5",
        className,
      )}
      {...props}
    >
      {shortcuts.map((shortcut) => (
        <div key={shortcut.key} className="flex items-center gap-1">
          <kbd className="rounded-[3px] border border-border bg-card px-1.5 py-px text-[9px] font-medium text-muted-foreground">
            {shortcut.key}
          </kbd>
          <span className="text-[10px] text-muted-foreground">
            {shortcut.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────── TreeFooter ───────────────────────────── */

interface TreeFooterProps extends HTMLAttributes<HTMLDivElement> {
  stats: StatItem[];
}

function TreeFooter({ stats, className, ...props }: TreeFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between h-9 px-4 border-t border-border",
        className,
      )}
      {...props}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-1">
          <span
            className={cn(
              "text-xs font-semibold",
              stat.color ? statColorMap[stat.color] : "text-foreground",
            )}
          >
            {stat.value}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────── InteractiveTree ──────────────────────── */

interface InteractiveTreeProps extends HTMLAttributes<HTMLDivElement> {
  data: TreeNodeData[];
  title?: string;
  shortcuts?: ShortcutItem[];
  stats?: StatItem[];
  onTreeChange?: (tree: TreeNodeData[]) => void;
}

function InteractiveTree({
  data,
  title = "Organization Tree",
  shortcuts,
  stats,
  onTreeChange,
  className,
  ...props
}: InteractiveTreeProps) {
  const [tree, setTree] = useState<TreeNodeData[]>(data);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [addingChildToId, setAddingChildToId] = useState<string | null>(null);
  const [addingAfterSelectedId, setAddingAfterSelectedId] = useState<string | null>(null);
  const [addingRootPerson, setAddingRootPerson] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateTree = useCallback(
    (newTree: TreeNodeData[]) => {
      setTree(newTree);
      onTreeChange?.(newTree);
    },
    [onTreeChange],
  );

  /* ── Node click: select, toggle if has children ── */
  const handleNodeClick = useCallback(
    (id: string) => {
      setSelectedId(id);
      const node = findNodeById(tree, id);
      if (node?.children && node.children.length > 0) {
        setTree((prev) => toggleNodeById(prev, id));
      }
    },
    [tree],
  );

  /* ── Toggle (chevron only, no select) ── */
  const handleToggle = useCallback((id: string) => {
    setTree((prev) => toggleNodeById(prev, id));
  }, []);

  /* ── Rename ── */
  const handleRenameSubmit = useCallback(
    (id: string, newName: string) => {
      const newTree = renameNodeById(tree, id, newName);
      updateTree(newTree);
      setRenamingId(null);
    },
    [tree, updateTree],
  );

  const handleRenameCancel = useCallback(() => {
    setRenamingId(null);
  }, []);

  /* ── Add child (report) ── */
  const handleAddChildSubmit = useCallback(
    (parentId: string, name: string) => {
      const newPerson: TreeNodeData = {
        id: `person-${Date.now()}`,
        name,
        initials: generateInitials(name),
      };
      const newTree = addChildToNode(tree, parentId, newPerson);
      updateTree(newTree);
      setAddingChildToId(null);
    },
    [tree, updateTree],
  );

  const handleAddChildCancel = useCallback(() => {
    setAddingChildToId(null);
  }, []);

  /* ── Add person via header button ── */
  // If a user is selected → add after them as sibling
  // If nothing selected → add at root level
  const handleHeaderAddPerson = useCallback(() => {
    if (selectedId) {
      // Show input after the selected node
      setAddingAfterSelectedId(selectedId);
    } else {
      setAddingRootPerson(true);
    }
  }, [selectedId]);

  const handleAddAfterSelectedSubmit = useCallback(
    (name: string) => {
      if (!addingAfterSelectedId) return;
      const newPerson: TreeNodeData = {
        id: `person-${Date.now()}`,
        name,
        initials: generateInitials(name),
      };
      const newTree = insertNodeNear(tree, addingAfterSelectedId, newPerson, "after");
      updateTree(newTree);
      setAddingAfterSelectedId(null);
    },
    [tree, updateTree, addingAfterSelectedId],
  );

  const handleAddAfterSelectedCancel = useCallback(() => {
    setAddingAfterSelectedId(null);
  }, []);

  const handleAddRootSubmit = useCallback(
    (name: string) => {
      const newPerson: TreeNodeData = {
        id: `person-${Date.now()}`,
        name,
        initials: generateInitials(name),
      };
      const newTree = [...tree, newPerson];
      updateTree(newTree);
      setAddingRootPerson(false);
    },
    [tree, updateTree],
  );

  const handleAddRootCancel = useCallback(() => {
    setAddingRootPerson(false);
  }, []);

  /* ── Drag & Drop via shared hook ── */
  const handleTreeDrop = useCallback(
    (sourceId: string, targetId: string, position: DropPosition) => {
      const { nodes: treeAfterRemove, removed } = removeNodeById(tree, sourceId);
      if (!removed) return;

      let newTree: TreeNodeData[];
      if (position === "inside") {
        newTree = addChildToNode(
          expandNodeById(treeAfterRemove, targetId),
          targetId,
          removed,
        );
      } else {
        newTree = insertNodeNear(treeAfterRemove, targetId, removed, position);
      }
      updateTree(newTree);
    },
    [tree, updateTree],
  );

  const { dragOverId, dropPosition, handlers: dragHandlers } = useTreeDragDrop({
    nodes: tree,
    getId: (n) => n.id,
    getChildren: (n) => n.children ?? [],
    onDrop: handleTreeDrop,
  });

  /* ── Keyboard shortcuts ── */
  const handleKeyDown = useCallback(
    (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "F2" && selectedId) {
        e.preventDefault();
        setRenamingId(selectedId);
      }

      if (e.key === "u" && (e.ctrlKey || e.metaKey) && selectedId) {
        e.preventDefault();
        // Auto-expand the node and show add-child input
        setTree((prev) => expandNodeById(prev, selectedId));
        setAddingChildToId(selectedId);
      }
    },
    [selectedId],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  /* ── Recursive renderer ── */
  const renderNodes = useCallback(
    (nodes: TreeNodeData[], level: number): ReactNode => {
      return nodes.map((node) => (
        <TreeNode
          key={node.id}
          data-testid={`tree-row-${node.id}`}
          node={node}
          level={level}
          draggable
          active={selectedId === node.id}
          renaming={renamingId === node.id}
          addingChild={addingChildToId === node.id}
          addingAfter={addingAfterSelectedId === node.id}
          onAddAfterSubmit={handleAddAfterSelectedSubmit}
          onAddAfterCancel={handleAddAfterSelectedCancel}
          dragOver={dragOverId === node.id}
          dropPosition={dragOverId === node.id ? (dropPosition ?? "inside") : "inside"}
          onClick={handleNodeClick}
          onToggle={handleToggle}
          onRenameSubmit={handleRenameSubmit}
          onRenameCancel={handleRenameCancel}
          onAddChildSubmit={handleAddChildSubmit}
          onAddChildCancel={handleAddChildCancel}
          onNodeDragStart={dragHandlers.onDragStart}
          onNodeDragOver={dragHandlers.onDragOver}
          onNodeDragLeave={dragHandlers.onDragLeave}
          onNodeDrop={dragHandlers.onDrop}
        >
          {node.expanded && node.children
            ? renderNodes(node.children, level + 1)
            : null}
        </TreeNode>
      ));
    },
    [
      selectedId,
      renamingId,
      addingChildToId,
      addingAfterSelectedId,
      dragOverId,
      dropPosition,
      handleNodeClick,
      handleToggle,
      handleRenameSubmit,
      handleRenameCancel,
      handleAddChildSubmit,
      handleAddChildCancel,
      handleAddAfterSelectedSubmit,
      handleAddAfterSelectedCancel,
      dragHandlers,
    ],
  );

  return (
    <Tree
      ref={containerRef}
      className={cn("outline-none", className)}
      tabIndex={0}
      {...props}
    >
      <TreeHeader title={title} onAddPerson={handleHeaderAddPerson} />
      <TreeContent>
        {renderNodes(tree, 0)}
        {addingRootPerson && (
          <AddChildInput
            level={-1}
            onSubmit={handleAddRootSubmit}
            onCancel={handleAddRootCancel}
          />
        )}
      </TreeContent>
      {shortcuts && <TreeShortcuts shortcuts={shortcuts} />}
      {stats && <TreeFooter stats={stats} />}
    </Tree>
  );
}

/* ─────────────────────── Exports ─────────────────────────────────── */

export {
  Tree,
  TreeHeader,
  TreeSearch,
  TreeContent,
  TreeNode,
  TreeShortcuts,
  TreeFooter,
  InteractiveTree,
  insertNodeNear,
  removeNodeById,
  type TreeProps,
  type TreeHeaderProps,
  type TreeSearchProps,
  type TreeContentProps,
  type TreeNodeProps,
  type TreeNodeData,
  type TreeShortcutsProps,
  type TreeFooterProps,
  type InteractiveTreeProps,
  type ShortcutItem,
  type StatItem,
};
