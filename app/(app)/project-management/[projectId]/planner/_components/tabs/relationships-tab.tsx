"use client";

import { memo, useMemo } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActivityData, ActivityRelationshipData } from "../types";

/* ─────────────────────── Props ─────────────────────────────────── */

interface RelationshipsTabProps {
  activityId: string;
  activities: ActivityData[];
  relationships: ActivityRelationshipData[];
  onRemoveRelationship?: (relationshipId: string) => void;
}

/* ─────────────────────── Sub-table ─────────────────────────────── */

function RelationshipTable({
  title,
  rows,
  activityMap,
  emptyText,
  onRemoveRelationship,
}: {
  title: string;
  rows: ActivityRelationshipData[];
  activityMap: Map<string, ActivityData>;
  emptyText: string;
  onRemoveRelationship?: (relationshipId: string) => void;
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
        {onRemoveRelationship && <span className="w-[32px]" />}
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-4">
          <span className="text-[12px] text-muted-foreground">{emptyText}</span>
        </div>
      ) : (
        rows.map((rel) => {
          const otherActId = title === "Predecessors" ? rel.predecessorId : rel.successorId;
          const otherAct = activityMap.get(otherActId);
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
              {onRemoveRelationship && (
                <span className="w-[32px] flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveRelationship(rel.id)}
                    data-testid={`remove-rel-${rel.id}`}
                  >
                    <X size={12} />
                  </Button>
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

/* ─────────────────────── Component ─────────────────────────────── */

const RelationshipsTab = memo(function RelationshipsTab({ activityId, activities, relationships, onRemoveRelationship }: RelationshipsTabProps) {
  const activityMap = useMemo(
    () => new Map(activities.map((a) => [a.id, a])),
    [activities],
  );

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
        activityMap={activityMap}
        emptyText="No predecessors"
        onRemoveRelationship={onRemoveRelationship}
      />
      <RelationshipTable
        title="Successors"
        rows={successors}
        activityMap={activityMap}
        emptyText="No successors"
        onRemoveRelationship={onRemoveRelationship}
      />
    </div>
  );
});

export { RelationshipsTab };
export type { RelationshipsTabProps };
