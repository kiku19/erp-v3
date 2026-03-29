"use client";

import { useCallback, useState, useMemo } from "react";
import { Plus, Users, Briefcase, CalendarDays, AlertTriangle, User, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpotlightSearch } from "@/components/ui/spotlight-search";
import { Tooltip } from "@/components/ui/tooltip";
import { useOrgSetup } from "./context";
import {
  type NodeLayout,
  type Person,
  type CostCenter,
  MAX_DEPTH,
} from "./types";

/* ─────────────────────── Component ─────────────────────────────── */

interface NodeCardProps {
  nodeId: string;
  layout: NodeLayout;
  isFirstNode: boolean;
}

function NodeCard({ nodeId, layout, isFirstNode }: NodeCardProps) {
  const { state, dispatch, getNodePeopleCount, getNodeTotalPeopleCount, getNodeRolesCount, getNodeDepth, loadNodePeople } = useOrgSetup();
  const node = state.nodes[nodeId];
  const [showNodeHeadSearch, setShowNodeHeadSearch] = useState(false);
  const [showCostCenterSearch, setShowCostCenterSearch] = useState(false);

  if (!node) return null;

  const isSelected = state.ui.selectedNodeId === nodeId;
  const isRoot = node.type === "COMPANY_ROOT";
  const depth = getNodeDepth(nodeId);
  const canAddChild = depth < MAX_DEPTH;
  const peopleCount = getNodePeopleCount(nodeId);
  const totalPeopleCount = getNodeTotalPeopleCount(nodeId);
  const rolesCount = getNodeRolesCount(nodeId);
  const calendarName = node.calendarName ?? (node.calendarId ? state.calendars[node.calendarId]?.name : null) ?? null;
  const costCenterName = node.costCenterName ?? (node.costCenterId ? state.costCenters[node.costCenterId]?.name : null) ?? null;
  const nodeHeadName = node.nodeHeadName ?? (node.nodeHeadPersonId ? state.people[node.nodeHeadPersonId]?.name : null) ?? null;
  const hasNoDivisions = isRoot && node.children.length === 0;

  // Inline validation warnings
  const warnings: string[] = [];

  if (isRoot && !node.nodeHeadPersonId) {
    warnings.push("No node head assigned");
  }

  if (!isRoot && peopleCount > 0 && !calendarName) {
    warnings.push("No calendar assigned");
  }

  const badRates = node.assignedRoles.filter(
    (r) => r.standardRate === null || r.standardRate <= 0
  );
  if (badRates.length > 0) {
    warnings.push(`${badRates.length} role(s) missing rates`);
  }

  // People in this node (last 10) for node head search
  const nodePeople = useMemo(
    () => Object.values(state.people).filter((p) => p.nodeId === nodeId).slice(0, 10),
    [state.people, nodeId],
  );

  // All cost centers (last 10) for cost center search
  const costCentersList = useMemo(
    () => Object.values(state.costCenters).slice(0, 10),
    [state.costCenters],
  );

  const handleOpen = useCallback(() => {
    dispatch({ type: "SET_SELECTED_NODE", nodeId });
    dispatch({ type: "OPEN_NODE_MODAL", nodeId });
  }, [dispatch, nodeId]);

  const handleAddChild = useCallback(() => {
    dispatch({ type: "SET_ADD_NODE_TARGET", target: { parentId: nodeId, type: "child" } });
  }, [dispatch, nodeId]);

  const handleSelectNodeHead = useCallback(
    (person: Person) => {
      dispatch({ type: "UPDATE_NODE", nodeId, updates: { nodeHeadPersonId: person.id } });
      setShowNodeHeadSearch(false);
    },
    [dispatch, nodeId],
  );

  const handleSelectCostCenter = useCallback(
    (cc: CostCenter) => {
      dispatch({ type: "UPDATE_NODE", nodeId, updates: { costCenterId: cc.id } });
      setShowCostCenterSearch(false);
    },
    [dispatch, nodeId],
  );

  return (
    <>
      <div
        id={`node-${nodeId}`}
        data-testid={`node-card-${nodeId}`}
        className={cn(
          "absolute flex flex-col rounded-lg border bg-card cursor-pointer",
          "transition-all duration-[var(--duration-normal)] ease-[var(--ease-default)]",
          "shadow-[var(--shadow-node)] hover:shadow-[var(--shadow-node-hover)]",
          "animation-[node-enter_200ms_var(--ease-default)]",
          isSelected
            ? "border-l-[3px] border-l-primary bg-primary-active/5"
            : "border-border",
        )}
        style={{
          left: layout.x,
          top: layout.y,
          width: layout.width,
          minHeight: layout.height,
        }}
        onClick={handleOpen}
      >
        {/* Header */}
        <div className="flex min-w-0 flex-col px-3 pt-3 pb-2">
          <span className="truncate text-sm font-semibold text-foreground">{node.name}</span>
          <span className="font-mono text-[11px] text-muted-foreground">{node.code}</span>
        </div>

        {/* Divider */}
        <div className="mx-3 h-px bg-border" />

        {/* Stats */}
        <div className="flex flex-col gap-1 px-3 py-2">
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users size={12} />
              {peopleCount} people
              {totalPeopleCount > peopleCount && (
                <span className="text-[10px] text-muted-foreground/70">({totalPeopleCount} total)</span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase size={12} />
              {rolesCount} roles
            </span>
          </div>
          {nodeHeadName && (
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <User size={12} />
              {nodeHeadName}
            </span>
          )}
          {calendarName && (
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <CalendarDays size={12} />
              {calendarName}
            </span>
          )}
          {costCenterName && (
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <Wallet size={12} />
              {costCenterName}
            </span>
          )}
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="flex flex-col gap-0.5 px-3 pb-1">
            {warnings.map((w) => (
              <span key={w} className="flex items-center gap-1 text-[11px] text-warning-foreground">
                <AlertTriangle size={10} className="shrink-0" />
                {w}
              </span>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="mx-3 h-px bg-border" />

        {/* Actions */}
        <div className="flex items-center gap-1 px-2 py-2" onClick={(e) => e.stopPropagation()}>
          <Tooltip content="Assign Node Head" side="bottom">
            <button
              type="button"
              data-testid={`assign-node-head-${nodeId}`}
              aria-label="Assign Node Head"
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md cursor-pointer",
                "text-muted-foreground hover:bg-muted-hover hover:text-foreground",
                "transition-colors duration-[var(--duration-fast)]",
              )}
              onClick={() => { loadNodePeople(nodeId); setShowNodeHeadSearch(true); }}
            >
              <User size={14} />
            </button>
          </Tooltip>
          <Tooltip content="Assign Cost Center" side="bottom">
            <button
              type="button"
              data-testid={`assign-cost-center-${nodeId}`}
              aria-label="Assign Cost Center"
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md cursor-pointer",
                "text-muted-foreground hover:bg-muted-hover hover:text-foreground",
                "transition-colors duration-[var(--duration-fast)]",
              )}
              onClick={() => setShowCostCenterSearch(true)}
            >
              <Wallet size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Right-edge add-child button */}
      {canAddChild && (
        <button
          data-testid={`add-child-${nodeId}`}
          className={cn(
            "absolute flex h-5 w-5 items-center justify-center rounded-full",
            "border border-[var(--color-connector)] bg-card text-muted-foreground",
            "transition-all duration-[var(--duration-fast)] ease-[var(--ease-default)]",
            "hover:border-primary hover:text-primary hover:shadow-[var(--shadow-node-hover)]",
            "cursor-pointer",
            hasNoDivisions && "animate-[pulse-attention_2s_ease-in-out_infinite]",
          )}
          style={{
            left: layout.x + layout.width - 10,
            top: layout.y + layout.height / 2 - 10,
          }}
          aria-label={`Add child to ${node.name}`}
          onClick={(e) => {
            e.stopPropagation();
            handleAddChild();
          }}
        >
          <Plus size={12} />
        </button>
      )}

      {/* Empty state hint — only for root with no divisions */}
      {hasNoDivisions && isFirstNode && (
        <div
          className="absolute text-center text-sm text-muted-foreground"
          style={{
            left: layout.x + layout.width + 16,
            top: layout.y + layout.height / 2 + 16,
          }}
        >
          Click <strong>+</strong> to add your first node.
        </div>
      )}

      {/* Node Head search */}
      <SpotlightSearch<Person>
        open={showNodeHeadSearch}
        onClose={() => setShowNodeHeadSearch(false)}
        placeholder="Search people..."
        items={nodePeople}
        onSelect={handleSelectNodeHead}
        filterFn={(person, q) => {
          const lower = q.toLowerCase();
          return person.name.toLowerCase().includes(lower) || person.employeeId.toLowerCase().includes(lower);
        }}
        renderItem={(person) => (
          <div className="flex items-center gap-2">
            <User size={14} className="text-muted-foreground" />
            <span className="text-[12px] font-medium text-foreground">{person.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {person.employeeId}
            </span>
          </div>
        )}
      />

      {/* Cost Center search */}
      <SpotlightSearch<CostCenter>
        open={showCostCenterSearch}
        onClose={() => setShowCostCenterSearch(false)}
        placeholder="Search cost centers..."
        items={costCentersList}
        onSelect={handleSelectCostCenter}
        filterFn={(cc, q) => {
          const lower = q.toLowerCase();
          return cc.name.toLowerCase().includes(lower) || cc.code.toLowerCase().includes(lower);
        }}
        renderItem={(cc) => (
          <div className="flex items-center gap-2">
            <Wallet size={14} className="text-muted-foreground" />
            <span className="text-[12px] font-medium text-foreground">{cc.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {cc.code}
            </span>
          </div>
        )}
      />
    </>
  );
}

export { NodeCard };
