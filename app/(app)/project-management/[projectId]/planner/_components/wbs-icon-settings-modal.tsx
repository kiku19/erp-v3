"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";
import { WBS_ICON_MAP, ALL_ICON_NAMES, DEFAULT_ICON_ORDER } from "./wbs-icon-map";

interface WbsIconSettingsModalProps {
  open: boolean;
  onClose: () => void;
  icons: string[];
  onSave: (icons: string[]) => void;
}

function WbsIconSettingsModal({ open, onClose, icons, onSave }: WbsIconSettingsModalProps) {
  const [selected, setSelected] = useState<string[]>(icons);

  // Reset local state when modal opens with new icons
  const handleToggleIcon = useCallback((name: string) => {
    setSelected((prev) => {
      if (prev.includes(name)) {
        return prev.filter((n) => n !== name);
      }
      return [...prev, name];
    });
  }, []);

  const handleMoveUp = useCallback((name: string) => {
    setSelected((prev) => {
      const idx = prev.indexOf(name);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const handleMoveDown = useCallback((name: string) => {
    setSelected((prev) => {
      const idx = prev.indexOf(name);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setSelected(DEFAULT_ICON_ORDER);
  }, []);

  const handleSave = useCallback(() => {
    if (selected.length === 0) return;
    onSave(selected);
    onClose();
  }, [selected, onSave, onClose]);

  return (
    <Modal open={open} onClose={onClose} width={480}>
      <ModalHeader
        title="WBS Icon Settings"
        description="Choose and reorder icons for click-to-cycle"
        onClose={onClose}
      />
      <ModalBody className="flex flex-col gap-4">
        {/* Cycle order */}
        <div>
          <p className="text-[12px] font-semibold text-foreground mb-2">Cycle Order</p>
          {selected.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">No icons selected. Click icons below to add.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {selected.map((name, idx) => {
                const Icon = WBS_ICON_MAP[name];
                if (!Icon) return null;
                return (
                  <div
                    key={name}
                    data-testid={`cycle-item-${name}`}
                    className="flex items-center gap-2 h-8 px-2 rounded-[4px] bg-muted text-foreground text-[12px]"
                  >
                    <Icon size={14} fill="currentColor" />
                    <span className="flex-1">{name}</span>
                    <button
                      data-testid={`move-up-${name}`}
                      className="text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                      disabled={idx === 0}
                      onClick={() => handleMoveUp(name)}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      data-testid={`move-down-${name}`}
                      className="text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                      disabled={idx === selected.length - 1}
                      onClick={() => handleMoveDown(name)}
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* All available icons */}
        <div>
          <p className="text-[12px] font-semibold text-foreground mb-2">Available Icons</p>
          <div className="grid grid-cols-8 gap-1">
            {ALL_ICON_NAMES.map((name) => {
              const Icon = WBS_ICON_MAP[name];
              if (!Icon) return null;
              const isActive = selected.includes(name);
              return (
                <button
                  key={name}
                  data-testid={`icon-toggle-${name}`}
                  title={name}
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-md cursor-pointer transition-colors duration-[var(--duration-fast)]",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted-hover hover:text-foreground",
                  )}
                  onClick={() => handleToggleIcon(name)}
                >
                  <Icon size={16} fill="currentColor" />
                </button>
              );
            })}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={selected.length === 0}
        >
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export { WbsIconSettingsModal };
