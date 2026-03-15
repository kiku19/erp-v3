"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  FolderPlus,
  Search,
  ChevronRight,
  Home,
  ChevronsDownUp,
} from "lucide-react";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutosaveIndicator } from "@/components/ui/stale-banner";
import { useCanvas, type EpsTreeNode } from "./_components/use-canvas";
import { useKeyboardShortcuts } from "./_components/use-keyboard-shortcuts";
import { EpsTreePanel, type EpsTreePanelHandle } from "./_components/eps-tree-panel";
import { EpsTablePanel, type TableItem } from "./_components/eps-table-panel";

import { AddNodeModal } from "./_components/add-node-modal";
import { AddProjectModal } from "./_components/add-project-modal";
import { SearchModal } from "./_components/search-modal";

/* ─────────────────────── Helpers ─────────────────────────────────── */

function getEpsList(treeData: EpsTreeNode[]): { id: string; name: string }[] {
  return treeData
    .filter((node) => node.type === "eps")
    .map((node) => ({ id: node.id, name: node.name }));
}

function countStats(treeData: EpsTreeNode[]): {
  nodes: number;
  projects: number;
  active: number;
} {
  let nodes = 0;
  let projects = 0;
  let active = 0;

  function traverse(items: EpsTreeNode[]) {
    for (const item of items) {
      if (item.type === "node") nodes++;
      if (item.type === "project") {
        projects++;
        if (item.status?.toLowerCase() === "active") active++;
      }
      traverse(item.children);
    }
  }

  traverse(treeData);
  return { nodes, projects, active };
}

function findNodeById(nodes: EpsTreeNode[], id: string): EpsTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
}


function flattenChildren(node: EpsTreeNode): TableItem[] {
  const items: TableItem[] = [];

  function collect(children: EpsTreeNode[], level: number) {
    for (const child of children) {
      items.push({
        id: child.id,
        name: child.name,
        type: child.type === "eps" ? "node" : child.type,
        level,
        status: child.status,
      });
      if (child.children.length > 0) {
        collect(child.children, level + 1);
      }
    }
  }

  collect(node.children, 0);
  return items;
}

/* ─────────────────────── Inner page (needs toast context) ────────── */

function ProjectManagementPageInner() {
  const treePanelRef = useRef<EpsTreePanelHandle>(null);
  const router = useRouter();
  const { toast } = useToast();
  const {
    treeData,
    selectedId,
    selectedType,
    loading,
    isStale,
    saveStatus,
    lastSavedAt,
    pendingCount,
    createEps,
    createNode,
    createProject,
    reorderEps,
    moveNode,
    moveProject,
    search,
    selectNode,
    getSelectedEpsId,
    reload,
  } = useCanvas();

  // Inline / modal states
  const [addingEps, setAddingEps] = useState(false);
  const [showAddNode, setShowAddNode] = useState(false);
  const [addingNodeToId, setAddingNodeToId] = useState<string | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [addingProjectToId, setAddingProjectToId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [allCollapsed, setAllCollapsed] = useState(false);

  const epsList = useMemo(() => getEpsList(treeData), [treeData]);
  const stats = useMemo(() => countStats(treeData), [treeData]);
  const selectedEpsId = getSelectedEpsId();

  // Selected node info for right panel
  const selectedNode = selectedId ? findNodeById(treeData, selectedId) : null;
  const tableItems = useMemo(() => {
    if (!selectedNode) return [];
    return flattenChildren(selectedNode);
  }, [selectedNode]);

  // Keyboard shortcut actions
  const handleOpenAddNode = useCallback(() => {
    if (epsList.length === 0) {
      toast({
        variant: "warning",
        title: "No EPS available",
        message: "Create an EPS first before adding nodes.",
      });
      return;
    }
    if (selectedId && (selectedType === "eps" || selectedType === "node")) {
      setAddingNodeToId(selectedId);
    } else {
      setShowAddNode(true);
    }
  }, [epsList, toast, selectedId, selectedType]);

  const handleOpenAddProject = useCallback(() => {
    if (epsList.length === 0) {
      toast({
        variant: "warning",
        title: "No EPS available",
        message: "Create an EPS first before adding projects.",
      });
      return;
    }
    if (selectedId && (selectedType === "eps" || selectedType === "node")) {
      setAddingProjectToId(selectedId);
    } else {
      setShowAddProject(true);
    }
  }, [epsList, toast, selectedId, selectedType]);

  useKeyboardShortcuts({
    onCreateEps: () => setAddingEps(true),
    onAddNode: handleOpenAddNode,
    onAddProject: handleOpenAddProject,
    onSearch: () => setShowSearch(true),
  });

  // Handlers — all local-first (synchronous), no await needed
  const handleCreateEps = useCallback(
    (name: string) => {
      createEps(name);
      setAddingEps(false);
      toast({ variant: "success", title: "EPS Created", message: `"${name}" has been created.` });
    },
    [createEps, toast],
  );

  const handleCancelAddEps = useCallback(() => {
    setAddingEps(false);
  }, []);

  const handleAddNode = useCallback(
    (epsId: string, name: string, parentNodeId?: string) => {
      createNode(epsId, name, parentNodeId);
      setShowAddNode(false);
      toast({ variant: "success", title: "Node Added", message: `"${name}" has been added.` });
    },
    [createNode, toast],
  );

  const handleInlineAddNode = useCallback(
    (name: string) => {
      if (!addingNodeToId || !selectedType) return;
      const epsId = selectedType === "eps" ? addingNodeToId : getSelectedEpsId();
      if (!epsId) return;
      const parentNodeId = selectedType === "node" ? addingNodeToId : undefined;
      createNode(epsId, name, parentNodeId);
      setAddingNodeToId(null);
      toast({ variant: "success", title: "Node Added", message: `"${name}" has been added.` });
    },
    [addingNodeToId, selectedType, getSelectedEpsId, createNode, toast],
  );

  const handleCancelAddNode = useCallback(() => {
    setAddingNodeToId(null);
  }, []);

  const handleInlineAddProject = useCallback(
    (name: string) => {
      if (!addingProjectToId || !selectedType) return;
      const epsId = selectedType === "eps" ? addingProjectToId : getSelectedEpsId();
      if (!epsId) return;
      const nodeId = selectedType === "node" ? addingProjectToId : undefined;
      createProject(epsId, { name, nodeId });
      setAddingProjectToId(null);
      toast({ variant: "success", title: "Project Added", message: `"${name}" has been created.` });
    },
    [addingProjectToId, selectedType, getSelectedEpsId, createProject, toast],
  );

  const handleCancelAddProject = useCallback(() => {
    setAddingProjectToId(null);
  }, []);

  const handleAddProject = useCallback(
    (epsId: string, data: { name: string; responsibleManager?: string; startDate?: string; endDate?: string }) => {
      const nodeId = selectedType === "node" ? selectedId : undefined;
      createProject(epsId, { name: data.name, nodeId: nodeId ?? undefined });
      setShowAddProject(false);
      toast({ variant: "success", title: "Project Added", message: `"${data.name}" has been created.` });
    },
    [createProject, toast, selectedId, selectedType],
  );

  const handleSearchSelect = useCallback(
    (id: string, type: "eps" | "node" | "project") => {
      selectNode(id, type);
      setShowSearch(false);
    },
    [selectNode],
  );

  const handleTreeSelect = useCallback(
    (id: string, type: "eps" | "node" | "project") => {
      selectNode(id, type);
    },
    [selectNode],
  );

  const handleTreeDoubleClick = useCallback(
    (id: string, type: "eps" | "node" | "project") => {
      if (type === "project") {
        router.push(`/project-management/${id}/planner`);
      }
    },
    [router],
  );

  // Drag-drop handlers (local-first, synchronous)
  const handleReorderEps = useCallback(
    (orderedIds: string[]) => {
      reorderEps(orderedIds);
    },
    [reorderEps],
  );

  const handleMoveNode = useCallback(
    (nodeId: string, targetEpsId: string, parentNodeId: string | null, sortOrder: number) => {
      moveNode(nodeId, targetEpsId, parentNodeId, sortOrder);
    },
    [moveNode],
  );

  const handleMoveProject = useCallback(
    (projectId: string, targetEpsId: string, nodeId: string | null, sortOrder: number) => {
      moveProject(projectId, targetEpsId, nodeId, sortOrder);
    },
    [moveProject],
  );

  // Stale reload
  const handleReload = useCallback(async () => {
    setReloading(true);
    await reload();
    setReloading(false);
  }, [reload]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Breadcrumb bar */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border">
        <Home size={14} className="text-muted-foreground" />
        <span className="text-[12px] text-muted-foreground">Home</span>
        <ChevronRight size={12} className="text-muted-foreground" />
        <span className="text-[12px] font-medium text-foreground">
          Enterprise Project Structure
        </span>
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">
          Project Management
        </h1>
        <div className="flex items-center gap-2">
          <AutosaveIndicator
            status={isStale ? "stale" : saveStatus}
            lastSavedAt={lastSavedAt}
            pendingCount={pendingCount}
            onReload={isStale ? handleReload : undefined}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddingEps(true)}
          >
            <Building2 size={14} />
            Create EPS
            <kbd className="ml-1 rounded-[3px] border border-border bg-muted px-1 py-px text-[9px] font-medium text-muted-foreground">
              ⌘E
            </kbd>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAddNode}
          >
            <Plus size={14} />
            Add Node
            <kbd className="ml-1 rounded-[3px] border border-border bg-muted px-1 py-px text-[9px] font-medium text-muted-foreground">
              ⌘⌥N
            </kbd>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAddProject}
          >
            <FolderPlus size={14} />
            Add Project
            <kbd className="ml-1 rounded-[3px] border border-border bg-muted px-1 py-px text-[9px] font-medium text-muted-foreground">
              ⌘⌥P
            </kbd>
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (allCollapsed) {
              treePanelRef.current?.expandAll();
            } else {
              treePanelRef.current?.collapseAll();
            }
          }}
        >
          <ChevronsDownUp size={14} />
          {allCollapsed ? "Expand All" : "Collapse All"}
        </Button>
        <div className="flex-1" />
        <div className="relative w-[240px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder="Search... (⌘F)"
            className="pl-9 h-8 text-sm"
            onFocus={() => setShowSearch(true)}
          />
        </div>
      </div>

      {/* Body: split panel */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Tree panel */}
        <EpsTreePanel
          ref={treePanelRef}
          treeData={treeData}
          selectedId={selectedId}
          loading={loading}
          onSelect={handleTreeSelect}
          onDoubleClick={handleTreeDoubleClick}
          stats={stats}
          addingEps={addingEps}
          onAddEpsSubmit={handleCreateEps}
          onAddEpsCancel={handleCancelAddEps}
          addingNodeToId={addingNodeToId}
          onAddNodeSubmit={handleInlineAddNode}
          onAddNodeCancel={handleCancelAddNode}
          addingProjectToId={addingProjectToId}
          onAddProjectSubmit={handleInlineAddProject}
          onAddProjectCancel={handleCancelAddProject}
          onReorderEps={handleReorderEps}
          onMoveNode={handleMoveNode}
          onMoveProject={handleMoveProject}
          onAllCollapsedChange={setAllCollapsed}
        />

        {/* Splitter */}
        <div className="w-px bg-border shrink-0" />

        {/* Right: Table panel */}
        <EpsTablePanel
          items={tableItems}
          selectedName={selectedNode?.name ?? "—"}
          loading={loading}
        />
      </div>

      {/* Footer: keyboard shortcuts + autosave status */}
      <div className="flex items-center justify-center gap-6 px-4 py-1.5 border-t border-border bg-muted shrink-0">
        <div className="flex items-center gap-1">
          <kbd className="rounded-[3px] border border-border bg-card px-1.5 py-px text-[9px] font-medium text-muted-foreground">
            ⌘E
          </kbd>
          <span className="text-[10px] text-muted-foreground">Create EPS</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className="rounded-[3px] border border-border bg-card px-1.5 py-px text-[9px] font-medium text-muted-foreground">
            ⌘⌥N
          </kbd>
          <span className="text-[10px] text-muted-foreground">Add Node</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className="rounded-[3px] border border-border bg-card px-1.5 py-px text-[9px] font-medium text-muted-foreground">
            ⌘⌥P
          </kbd>
          <span className="text-[10px] text-muted-foreground">Add Project</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className="rounded-[3px] border border-border bg-card px-1.5 py-px text-[9px] font-medium text-muted-foreground">
            ⌘F
          </kbd>
          <span className="text-[10px] text-muted-foreground">Search</span>
        </div>
      </div>

      {/* Modals (fallback when nothing selected) */}
      <AddNodeModal
        open={showAddNode}
        onClose={() => setShowAddNode(false)}
        onSubmit={handleAddNode}
        epsList={epsList}
        selectedEpsId={selectedEpsId ?? undefined}
      />

      <AddProjectModal
        open={showAddProject}
        onClose={() => setShowAddProject(false)}
        onSubmit={handleAddProject}
        epsList={epsList}
        selectedEpsId={selectedEpsId ?? undefined}
      />

      <SearchModal
        open={showSearch}
        onClose={() => setShowSearch(false)}
        onSelect={handleSearchSelect}
        searchFn={search}
      />
    </div>
  );
}

/* ─────────────────────── Page wrapper ────────────────────────────── */

export default function ProjectManagementPage() {
  return (
    <ToastProvider>
      <ProjectManagementPageInner />
    </ToastProvider>
  );
}
