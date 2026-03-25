"use client";

import { useCallback } from "react";
import { Settings, Plus, Users, Briefcase, CalendarDays, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOrgSetup } from "./context";
import {
  type OBSNodeType,
  type NodeLayout,
  NODE_TYPE_LABELS,
  MAX_DEPTH,
} from "./types";

/* ─────────────────────── Color mapping ─────────────────────────── */

const NODE_DOT_COLORS: Record<OBSNodeType, string> = {
  COMPANY_ROOT: "bg-[var(--color-obs-root)]",
  DIVISION: "bg-[var(--color-obs-division)]",
  DEPARTMENT: "bg-[var(--color-obs-department)]",
  TEAM: "bg-[var(--color-obs-team)]",
};

const NODE_SELECTED_BORDER: Record<OBSNodeType, string> = {
  COMPANY_ROOT: "border-l-[var(--color-obs-root)]",
  DIVISION: "border-l-[var(--color-obs-division)]",
  DEPARTMENT: "border-l-[var(--color-obs-department)]",
  TEAM: "border-l-[var(--color-obs-team)]",
};

const NODE_SELECTED_BG: Record<OBSNodeType, string> = {
  COMPANY_ROOT: "bg-[var(--color-obs-root-bg)]",
  DIVISION: "bg-[var(--color-obs-division-bg)]",
  DEPARTMENT: "bg-[var(--color-obs-department-bg)]",
  TEAM: "bg-[var(--color-obs-team-bg)]",
};

/* ─────────────────────── Component ─────────────────────────────── */

interface NodeCardProps {
  nodeId: string;
  layout: NodeLayout;
  isFirstNode: boolean;
}

function NodeCard({ nodeId, layout, isFirstNode }: NodeCardProps) {
  const { state, dispatch, getNodePeopleCount, getNodeRolesCount, getNodeDepth } = useOrgSetup();
  const node = state.nodes[nodeId];
  if (!node) return null;

  const isSelected = state.ui.selectedNodeId === nodeId;
  const isRoot = node.type === "COMPANY_ROOT";
  const depth = getNodeDepth(nodeId);
  const canAddChild = depth < MAX_DEPTH;
  const peopleCount = getNodePeopleCount(nodeId);
  const rolesCount = getNodeRolesCount(nodeId);
  const calendar = node.calendarId ? state.calendars[node.calendarId] : null;
  const hasNoDivisions = isRoot && node.children.length === 0;

  // Inline validation warnings
  const warnings: string[] = [];

  if (isRoot && !node.nodeHeadPersonId) {
    warnings.push("No node head assigned");
  }

  if (!isRoot && peopleCount > 0 && !node.calendarId) {
    warnings.push("No calendar assigned");
  }

  const badRates = node.assignedRoles.filter(
    (r) => r.standardRate === null || r.standardRate <= 0
  );
  if (badRates.length > 0) {
    warnings.push(`${badRates.length} role(s) missing rates`);
  }

  const handleOpen = useCallback(() => {
    dispatch({ type: "SET_SELECTED_NODE", nodeId });
    dispatch({ type: "OPEN_NODE_MODAL", nodeId });
  }, [dispatch, nodeId]);

  const handleAddChild = useCallback(() => {
    dispatch({ type: "SET_ADD_NODE_TARGET", target: { parentId: nodeId, type: "child" } });
  }, [dispatch, nodeId]);

  const handleSelect = useCallback(() => {
    dispatch({ type: "SET_SELECTED_NODE", nodeId: isSelected ? null : nodeId });
  }, [dispatch, nodeId, isSelected]);

  return (
    <>
      <div
        id={`node-${nodeId}`}
        data-testid={`node-card-${nodeId}`}
        className={cn(
          "absolute flex flex-col rounded-lg border bg-card cursor-pointer",
          "transition-shadow duration-[var(--duration-normal)] ease-[var(--ease-default)]",
          "shadow-[var(--shadow-node)] hover:shadow-[var(--shadow-node-hover)]",
          "animation-[node-enter_200ms_var(--ease-default)]",
          isSelected
            ? cn("border-l-[3px]", NODE_SELECTED_BORDER[node.type], NODE_SELECTED_BG[node.type])
            : "border-border",
        )}
        style={{
          left: layout.x,
          top: layout.y,
          width: layout.width,
          minHeight: layout.height,
        }}
        onClick={handleSelect}
      >
        {/* Header */}
        <div className="flex items-start gap-2 px-3 pt-3 pb-2">
          <div className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", NODE_DOT_COLORS[node.type])} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-foreground">{node.name}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{node.code}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-3 h-px bg-border" />

        {/* Stats */}
        <div className="flex flex-col gap-1 px-3 py-2">
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users size={12} />
              {peopleCount} people
            </span>
            <span className="flex items-center gap-1">
              <Briefcase size={12} />
              {rolesCount} roles
            </span>
          </div>
          {calendar && (
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <CalendarDays size={12} />
              {calendar.name}
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
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[12px]" onClick={handleOpen}>
            <Settings size={12} />
            Open
          </Button>
        </div>
      </div>

      {/* Right-edge add-child button with extending line */}
      {canAddChild && (
        <div
          data-testid={`add-child-${nodeId}`}
          className="absolute flex items-center"
          style={{
            left: layout.x + layout.width,
            top: layout.y + layout.height / 2,
            transform: "translateY(-50%)",
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleAddChild();
          }}
        >
          {/* Extending line */}
          <div
            className="h-px w-6"
            style={{ backgroundColor: "var(--color-connector)" }}
          />
          {/* Plus circle */}
          <button
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full",
              "border border-[var(--color-connector)] bg-card text-muted-foreground",
              "transition-all duration-[var(--duration-fast)] ease-[var(--ease-default)]",
              "hover:border-primary hover:text-primary hover:shadow-[var(--shadow-node-hover)]",
              "cursor-pointer",
              hasNoDivisions && "animate-[pulse-attention_2s_ease-in-out_infinite]",
            )}
            aria-label={`Add child to ${node.name}`}
          >
            <Plus size={12} />
          </button>
        </div>
      )}

      {/* Empty state hint — only for root with no divisions */}
      {hasNoDivisions && isFirstNode && (
        <div
          className="absolute text-center text-sm text-muted-foreground"
          style={{
            left: layout.x + layout.width + 40,
            top: layout.y + layout.height / 2 + 16,
          }}
        >
          Click <strong>+</strong> to add your first division.
        </div>
      )}
    </>
  );
}

export { NodeCard, NODE_DOT_COLORS, NODE_TYPE_LABELS };
