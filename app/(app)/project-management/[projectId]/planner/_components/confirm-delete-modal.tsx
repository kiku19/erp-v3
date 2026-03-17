"use client";

import { useState } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";

interface ConfirmDeleteModalProps {
  open: boolean;
  wbsName: string;
  childCount: number;
  activityCount: number;
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

function ConfirmDeleteModal({
  open,
  wbsName,
  childCount,
  activityCount,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const hasDescendants = childCount > 0 || activityCount > 0;

  return (
    <Modal open={open} onClose={onCancel} width={420}>
      <ModalHeader
        title="Delete WBS Folder"
        onClose={onCancel}
      />
      <ModalBody>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-destructive/10 shrink-0">
              <AlertTriangle size={20} className="text-destructive" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-foreground">
                Are you sure you want to delete <span className="font-semibold">&quot;{wbsName}&quot;</span>?
              </p>
              {hasDescendants && (
                <p className="text-[13px] text-muted-foreground">
                  This will also delete{" "}
                  {childCount > 0 && (
                    <span className="font-medium text-foreground">
                      {childCount} child folder{childCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {childCount > 0 && activityCount > 0 && " and "}
                  {activityCount > 0 && (
                    <span className="font-medium text-foreground">
                      {activityCount} activit{activityCount !== 1 ? "ies" : "y"}
                    </span>
                  )}
                  .
                </p>
              )}
              <p className="text-[13px] text-muted-foreground">
                This action can be undone with Ctrl+Z.
              </p>
            </div>
          </div>

          <div className="pt-1">
            <Checkbox
              checked={dontShowAgain}
              onChange={setDontShowAgain}
              label="Don't ask me again"
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onConfirm(dontShowAgain)}
          data-testid="confirm-delete-btn"
        >
          Delete
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export { ConfirmDeleteModal, type ConfirmDeleteModalProps };
