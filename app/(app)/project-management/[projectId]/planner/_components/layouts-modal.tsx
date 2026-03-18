"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  LayoutTemplate,
  Trash2,
  Calendar,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutSummary {
  id: string;
  name: string;
  description: string;
  sourceProjectId: string | null;
  createdAt: string;
}

interface LayoutsModalProps {
  open: boolean;
  onClose: () => void;
  accessToken: string | null;
}

function LayoutsModal({ open, onClose, accessToken }: LayoutsModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [layouts, setLayouts] = useState<LayoutSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Mount/unmount animation
  useEffect(() => {
    if (open) {
      setIsClosing(false);
      setIsMounted(true);
    } else if (isMounted) {
      setIsClosing(true);
    }
  }, [open, isMounted]);

  useEffect(() => {
    if (!isClosing) return;
    const timer = setTimeout(() => {
      setIsMounted(false);
      setIsClosing(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [isClosing]);

  const handleAnimationEnd = useCallback(() => {
    if (isClosing) {
      setIsMounted(false);
      setIsClosing(false);
    }
  }, [isClosing]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    function handleEscape(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Fetch layouts
  const fetchLayouts = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/planner/layouts", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLayouts(data.layouts);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (open) fetchLayouts();
  }, [open, fetchLayouts]);

  const handleDelete = useCallback(async (layout: LayoutSummary) => {
    if (!accessToken) return;
    try {
      await fetch(`/api/planner/layouts/${layout.id}/delete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setLayouts((prev) => prev.filter((l) => l.id !== layout.id));
    } catch {
      // silently fail
    }
  }, [accessToken]);

  if (!isMounted) return null;

  const animStyle = {
    animation: isClosing
      ? "dropdown-out var(--duration-fast) var(--ease-default) forwards"
      : "dropdown-in var(--duration-normal) var(--ease-default) forwards",
  };

  const modal = (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[9998] bg-foreground/20"
        style={animStyle}
        onClick={onClose}
      />

      {/* Panel — 80% of screen */}
      <div
        role="dialog"
        aria-modal="true"
        onAnimationEnd={handleAnimationEnd}
        style={animStyle}
        className="fixed left-1/2 top-[10%] -translate-x-1/2 z-[9999] flex flex-col w-[560px] h-[80vh] rounded-lg border border-border bg-card shadow-[var(--shadow-dropdown)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <LayoutTemplate size={20} className="text-primary" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Project Layouts</h2>
              <p className="text-[12px] text-muted-foreground">Reusable project templates saved from existing projects</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex items-center justify-center rounded-md border border-border bg-background p-2 text-foreground hover:bg-muted-hover cursor-pointer transition-colors duration-[var(--duration-fast)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground">Loading layouts...</p>
            </div>
          ) : layouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <FileText size={40} className="text-muted-foreground" />
              <p className="text-muted-foreground">No layouts saved yet</p>
              <p className="text-[13px] text-muted-foreground">
                Click &quot;Save as Layout&quot; in the toolbar to create a template from this project
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {layouts.map((layout) => (
                <div
                  key={layout.id}
                  className="flex items-center justify-between p-4 rounded-md border border-border bg-background hover:bg-muted-hover transition-colors duration-[var(--duration-fast)]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <LayoutTemplate size={18} className="text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-foreground truncate">{layout.name}</p>
                      {layout.description && (
                        <p className="text-[12px] text-muted-foreground truncate">{layout.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      <Calendar size={13} />
                      {new Date(layout.createdAt).toLocaleDateString("en-US", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(layout)}
                      title="Delete layout"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}

export { LayoutsModal };
