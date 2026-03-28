"use client";

import { useState, useCallback, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ─────────────────────── Types ───────────────────────────────────── */

interface ConflictPerson {
  id: string;
  name: string;
  employeeId: string;
  currentNodeId: string;
  currentNodeName: string;
}

interface ConflictResolutionModalProps {
  open: boolean;
  onClose: () => void;
  people: ConflictPerson[];
  targetNodeName: string;
  onOverrideAll: () => void;
  onResolve: (acceptedIds: string[]) => void;
}

/* ─────────────────────── Component ───────────────────────────────── */

function ConflictResolutionModal({
  open,
  onClose,
  people,
  targetNodeName,
  onOverrideAll,
  onResolve,
}: ConflictResolutionModalProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    () => new Set(people.map((p) => p.id)),
  );

  // Reset checked state when people change
  useState(() => {
    setCheckedIds(new Set(people.map((p) => p.id)));
  });

  const toggleCheck = useCallback((personId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) {
        next.delete(personId);
      } else {
        next.add(personId);
      }
      return next;
    });
  }, []);

  const checkedCount = useMemo(() => checkedIds.size, [checkedIds]);

  const handleMoveSelected = useCallback(() => {
    onResolve(Array.from(checkedIds));
  }, [onResolve, checkedIds]);

  return (
    <Modal open={open} onClose={onClose} width={600}>
      <ModalHeader
        title="Resolve Assignment Conflicts"
        description={`These people are currently assigned to other nodes. Moving them to "${targetNodeName}" will reassign them immediately.`}
        onClose={onClose}
      />

      <ModalBody className="py-4 px-0">
        <div className="max-h-[320px] overflow-auto">
          {people.map((person) => (
            <label
              key={person.id}
              className={cn(
                "flex items-center gap-3 px-6 py-3 cursor-pointer transition-colors duration-[var(--duration-fast)]",
                "hover:bg-muted-hover",
              )}
            >
              <Checkbox
                checked={checkedIds.has(person.id)}
                onChange={() => toggleCheck(person.id)}
              />
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-[13px] font-medium text-foreground truncate">
                  {person.name}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  {person.employeeId}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <AlertTriangle size={12} className="text-warning-foreground" />
                <Badge variant="secondary" className="text-[10px]">
                  {person.currentNodeName}
                </Badge>
              </div>
            </label>
          ))}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          variant="outline"
          size="sm"
          data-testid="conflict-cancel-btn"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          variant="outline"
          size="sm"
          data-testid="conflict-override-all-btn"
          onClick={onOverrideAll}
        >
          Override All ({people.length})
        </Button>
        <Button
          size="sm"
          data-testid="conflict-move-selected-btn"
          onClick={handleMoveSelected}
          disabled={checkedCount === 0}
        >
          Move Selected ({checkedCount})
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/* ─────────────────────── Exports ─────────────────────────────────── */

export {
  ConflictResolutionModal,
  type ConflictResolutionModalProps,
  type ConflictPerson,
};
