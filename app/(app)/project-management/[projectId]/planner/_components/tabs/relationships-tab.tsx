"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActivityData, ActivityRelationshipData } from "../types";

/* ─────────────────────── Props ─────────────────────────────────── */

interface RelationshipsTabProps {
  activityId: string;
  activities: ActivityData[];
  relationships: ActivityRelationshipData[];
}

/* ─────────────────────── Sub-table ─────────────────────────────── */

function RelationshipTable({
  title,
  rows,
  activities,
  emptyText,
}: {
  title: string;
  rows: ActivityRelationshipData[];
  activities: ActivityData[];
  emptyText: string;
}) {
  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-foreground">{title}</span>
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
            {rows.length}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]">
          <Plus size={12} />
          Add
        </Button>
      </div>

      {/* Column header */}
      <div className="flex items-center rounded-t-[4px] bg-muted px-2 py-1.5">
        <span className="flex-1 text-[11px] font-semibold text-muted-foreground">Activity Name</span>
        <span className="w-[60px] text-center text-[11px] font-semibold text-muted-foreground">Type</span>
        <span className="w-[60px] text-right text-[11px] font-semibold text-muted-foreground">Lag</span>
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-4">
          <span className="text-[12px] text-muted-foreground">{emptyText}</span>
        </div>
      ) : (
        rows.map((rel) => {
          const otherActId = title === "Predecessors" ? rel.predecessorId : rel.successorId;
          const otherAct = activities.find((a) => a.id === otherActId);
          return (
            <div
              key={rel.id}
              className="flex items-center px-2 py-2 border-b border-border"
            >
              <span className="flex-1 text-[12px] text-foreground">
                {otherAct?.name ?? "Unknown"}
              </span>
              <span className="w-[60px] flex justify-center">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {rel.relationshipType}
                </Badge>
              </span>
              <span className="w-[60px] text-right text-[12px] text-foreground">
                {rel.lag === 0 ? "0" : `${rel.lag}d`}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ─────────────────────── Component ─────────────────────────────── */

function RelationshipsTab({ activityId, activities, relationships }: RelationshipsTabProps) {
  const predecessors = useMemo(
    () => relationships.filter((r) => r.successorId === activityId),
    [relationships, activityId],
  );

  const successors = useMemo(
    () => relationships.filter((r) => r.predecessorId === activityId),
    [relationships, activityId],
  );

  return (
    <div data-testid="relationships-tab" className="flex gap-6 p-4 h-full overflow-auto">
      <RelationshipTable
        title="Predecessors"
        rows={predecessors}
        activities={activities}
        emptyText="No predecessors"
      />
      <RelationshipTable
        title="Successors"
        rows={successors}
        activities={activities}
        emptyText="No successors"
      />
    </div>
  );
}

export { RelationshipsTab };
export type { RelationshipsTabProps };
