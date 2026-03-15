"use client";

import {
  Plus,
  Diamond,
  FolderPlus,
  IndentIncrease,
  IndentDecrease,
  Undo2,
  Redo2,
  Link2,
  Check,
  X,
  Filter,
  ListTree,
  Columns3,
  ShieldCheck,
  ZoomOut,
  ZoomIn,
  Maximize2,
  Search,
} from "lucide-react";
import type { LinkModeStatus } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ToolbarProps {
  onAddActivity?: () => void;
  onAddMilestone?: () => void;
  onAddWbs?: () => void;
  onIndent?: () => void;
  onOutdent?: () => void;
  indentDisabled?: boolean;
  outdentDisabled?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  undoDisabled?: boolean;
  redoDisabled?: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomFit?: () => void;
  linkMode?: LinkModeStatus;
  onToggleLinkMode?: () => void;
  onConfirmLink?: () => void;
  onCancelLink?: () => void;
  linkChainLength?: number;
}

export function Toolbar({
  onAddActivity,
  onAddMilestone,
  onAddWbs,
  onIndent,
  onOutdent,
  indentDisabled,
  outdentDisabled,
  onUndo,
  onRedo,
  undoDisabled,
  redoDisabled,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  linkMode = "idle",
  onToggleLinkMode,
  onConfirmLink,
  onCancelLink,
  linkChainLength = 0,
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 h-11 border-b border-border bg-card shrink-0">
      {/* Left */}
      <div className="flex items-center gap-2">
        {/* Add Group */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[12px]" onClick={onAddActivity} title="Add a new activity to the schedule">
            <Plus size={14} />
            Activity
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[12px]" onClick={onAddMilestone} title="Add a zero-duration milestone marker">
            <Diamond size={14} />
            Milestone
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[12px]" onClick={onAddWbs} title="Add a new WBS summary level">
            <FolderPlus size={14} />
            WBS
          </Button>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Indent Group */}
        <div className="flex items-center gap-0.5">
          <Button variant="icon" size="icon" className="h-7 w-7" onClick={onOutdent} disabled={outdentDisabled} title="Outdent selected item (move it up a level)">
            <IndentDecrease size={16} />
          </Button>
          <Button variant="icon" size="icon" className="h-7 w-7" onClick={onIndent} disabled={indentDisabled} title="Indent selected item (make it a child)">
            <IndentIncrease size={16} />
          </Button>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Undo Redo */}
        <div className="flex items-center gap-0.5">
          <Button variant="icon" size="icon" className="h-7 w-7" onClick={onUndo} disabled={undoDisabled} title="Undo last action (Ctrl+Z)">
            <Undo2 size={16} />
          </Button>
          <Button variant="icon" size="icon" className="h-7 w-7" onClick={onRedo} disabled={redoDisabled} title="Redo last undone action (Ctrl+Y)">
            <Redo2 size={16} />
          </Button>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Link Group */}
        <div className="flex items-center gap-0.5">
          <Button
            variant={linkMode === "linking" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-[12px]"
            onClick={onToggleLinkMode}
            title="Link activities: click in sequence to build dependency chains (Shift+click for parallel)"
          >
            <Link2 size={14} />
            Link
          </Button>
          {linkMode === "linking" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-success"
                onClick={onConfirmLink}
                disabled={linkChainLength < 2}
                title="Confirm link chain"
              >
                <Check size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={onCancelLink}
                title="Cancel link chain"
              >
                <X size={16} />
              </Button>
            </>
          )}
        </div>

        <div className="w-px h-6 bg-border" />

        {/* View Group */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[12px]" title="Filter activities by criteria">
            <Filter size={14} />
            Filter
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[12px]" title="Group activities by WBS, status, or resource">
            <ListTree size={14} />
            Group
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[12px]" title="Show or hide spreadsheet columns">
            <Columns3 size={14} />
            Columns
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[12px]" title="Run schedule quality checks">
            <ShieldCheck size={14} />
            Quality
          </Button>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Zoom Group */}
        <div className="flex items-center gap-0.5">
          <Button variant="icon" size="icon" className="h-7 w-7" onClick={onZoomOut} title="Zoom out (show more time range)">
            <ZoomOut size={16} />
          </Button>
          <Button variant="icon" size="icon" className="h-7 w-7" onClick={onZoomIn} title="Zoom in (show more detail)">
            <ZoomIn size={16} />
          </Button>
          <Button variant="icon" size="icon" className="h-7 w-7" onClick={onZoomFit} title="Fit entire schedule in view">
            <Maximize2 size={16} />
          </Button>
        </div>
      </div>

      {/* Right: Search */}
      <div className="flex items-center">
        <div className="relative w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder="Search activities..."
            className="pl-9 h-7 text-[12px]"
            title="Search activities by name or ID (Ctrl+F)"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <kbd className="rounded-[4px] bg-muted border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Ctrl+F
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
