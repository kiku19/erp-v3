"use client";

import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { ResourceData } from "./types";

/* ─────────────────────── Types ──────────────────────────────── */

interface ResourceSidebarProps {
  resources: ResourceData[];
  selectedResourceId: string | null;
  onSelectResource: (id: string | null) => void;
  onAddResource: (name: string, resourceType: "labor" | "equipment" | "material") => void;
  onUpdateResource: (id: string, fields: Partial<ResourceData>) => void;
  rowHeight: number;
  width?: number;
}

/* ─────────────────────── Badge variant map ───────────────────── */

const TYPE_BADGE: Record<ResourceData["resourceType"], { label: string; variant: "default" | "secondary" | "outline" | "success" | "error" | "warning" }> = {
  labor: { label: "Labor", variant: "default" },
  equipment: { label: "Equipment", variant: "warning" },
  material: { label: "Material", variant: "success" },
};

/* ─────────────────────── Component ──────────────────────────── */

function ResourceSidebar({
  resources,
  selectedResourceId,
  onSelectResource,
  onAddResource,
  onUpdateResource,
  rowHeight,
  width = 220,
}: ResourceSidebarProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const trimmed = addName.trim();
      if (trimmed) {
        onAddResource(trimmed, "labor");
        setAddName("");
        setIsAdding(false);
      }
    } else if (e.key === "Escape") {
      setAddName("");
      setIsAdding(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, resourceId: string) => {
    if (e.key === "Enter") {
      const trimmed = editName.trim();
      if (trimmed) {
        onUpdateResource(resourceId, { name: trimmed });
      }
      setEditingId(null);
      setEditName("");
    } else if (e.key === "Escape") {
      setEditingId(null);
      setEditName("");
    }
  };

  const handleEditBlur = (resourceId: string) => {
    const trimmed = editName.trim();
    if (trimmed) {
      onUpdateResource(resourceId, { name: trimmed });
    }
    setEditingId(null);
    setEditName("");
  };

  const startEditing = (resource: ResourceData) => {
    setEditingId(resource.id);
    setEditName(resource.name);
  };

  return (
    <div
      data-testid="resource-sidebar"
      className="flex flex-col border-r border-border bg-card shrink-0 overflow-hidden"
      style={{ width: `${width}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-9 px-3 border-b border-border shrink-0 whitespace-nowrap">
        <span className="text-[12px] font-semibold text-foreground">Resources</span>
      </div>

      {/* Resource rows */}
      <div className="flex-1 overflow-y-auto">
        {resources.map((resource) => {
          const isSelected = resource.id === selectedResourceId;
          const isEditing = resource.id === editingId;
          const badgeInfo = TYPE_BADGE[resource.resourceType];

          return (
            <div
              key={resource.id}
              data-testid={`resource-row-${resource.id}`}
              data-selected={isSelected ? "true" : undefined}
              className={`flex items-center gap-2 px-3 cursor-pointer border-b border-border ${
                isSelected ? "bg-muted" : "hover:bg-muted-hover"
              }`}
              style={{ height: `${rowHeight}px` }}
              onClick={() => onSelectResource(resource.id)}
              onDoubleClick={() => startEditing(resource)}
            >
              {isEditing ? (
                <Input
                  ref={editInputRef}
                  value={editName}
                  onChange={(e) => setEditName((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => handleEditKeyDown(e, resource.id)}
                  onBlur={() => handleEditBlur(resource.id)}
                  className="h-6 text-xs py-0 px-1"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span className="text-xs text-foreground truncate flex-1">
                    {resource.name}
                  </span>
                  <Badge variant={badgeInfo.variant} className="text-[10px] px-1.5 py-0">
                    {badgeInfo.label}
                  </Badge>
                </>
              )}
            </div>
          );
        })}

        {/* Add resource inline form */}
        {isAdding && (
          <div className="flex items-center px-3 border-b border-border" style={{ height: `${rowHeight}px` }}>
            <Input
              ref={addInputRef}
              placeholder="Resource name"
              value={addName}
              onChange={(e) => setAddName((e.target as HTMLInputElement).value)}
              onKeyDown={handleAddKeyDown}
              onBlur={() => {
                setIsAdding(false);
                setAddName("");
              }}
              className="h-6 text-xs py-0 px-1"
            />
          </div>
        )}
      </div>

      {/* Add Resource button */}
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-1 text-xs"
          onClick={() => setIsAdding(true)}
        >
          <Plus size={14} />
          Add Resource
        </Button>
      </div>
    </div>
  );
}

export { ResourceSidebar, type ResourceSidebarProps };
