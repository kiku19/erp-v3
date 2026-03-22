"use client";

import { useState, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const COLOR_OPTIONS = [
  { key: "error", label: "Red", dotClass: "bg-[var(--color-error)]" },
  { key: "warning", label: "Yellow", dotClass: "bg-[var(--color-warning)]" },
  { key: "info", label: "Blue", dotClass: "bg-[var(--color-info)]" },
  { key: "success", label: "Green", dotClass: "bg-[var(--color-success)]" },
  { key: "primary", label: "Dark", dotClass: "bg-primary" },
  { key: "accent", label: "Accent", dotClass: "bg-accent" },
];

interface AddExceptionTypeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; color: string }) => void;
}

function AddExceptionTypeModal({ open, onClose, onSave }: AddExceptionTypeModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("error");

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), color });
    setName("");
    setColor("error");
  }, [name, color, onSave]);

  const handleClose = useCallback(() => {
    setName("");
    setColor("error");
    onClose();
  }, [onClose]);

  return (
    <Modal open={open} onClose={handleClose} width={380}>
      <div className="flex flex-col">
        <div className="px-6 py-5">
          <h2 className="text-base font-semibold text-foreground">Add Exception Type</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Create a new exception type with a name and color.
          </p>
        </div>

        <div className="h-px bg-border" />

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-foreground">Type Name</span>
            <Input
              placeholder="e.g. Company Event, Maintenance..."
              className="h-9 text-[12px]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Color */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-foreground">Color</span>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setColor(opt.key)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-[12px] font-medium cursor-pointer transition-colors duration-[var(--duration-fast)] border",
                    color === opt.key
                      ? "border-foreground bg-muted text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted-hover",
                  )}
                >
                  <div className={cn("w-3 h-3 rounded-full", opt.dotClass)} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="flex items-center justify-end gap-2 px-6 py-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Add Type
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export { AddExceptionTypeModal };
export type { AddExceptionTypeModalProps };
