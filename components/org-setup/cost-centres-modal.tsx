"use client";

import { useState, useCallback } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalHeader, ModalBody } from "@/components/ui/modal";
import { useOrgSetup, generateId } from "./context";
import { type CostCentre, type CostCentreType } from "./types";

const TYPE_OPTIONS = [
  { value: "labour", label: "Labour" },
  { value: "equipment", label: "Equipment" },
  { value: "material", label: "Material" },
  { value: "overhead", label: "Overhead" },
  { value: "other", label: "Other" },
];

const TYPE_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline" | "success" | "warning" | "error"> = {
  labour: "default",
  equipment: "secondary",
  material: "warning",
  overhead: "outline",
  other: "secondary",
};

interface CostCentresModalProps {
  open: boolean;
  onClose: () => void;
}

function CostCentresModal({ open, onClose }: CostCentresModalProps) {
  const { state, dispatch } = useOrgSetup();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<CostCentreType>("labour");

  const costCentres = Object.values(state.costCentres);

  const resetForm = useCallback(() => {
    setFormCode("");
    setFormDescription("");
    setFormType("labour");
    setEditingId(null);
    setShowForm(false);
  }, []);

  const openNew = useCallback(() => {
    resetForm();
    setShowForm(true);
  }, [resetForm]);

  const openEdit = useCallback((cc: CostCentre) => {
    setFormCode(cc.code);
    setFormDescription(cc.description);
    setFormType(cc.type);
    setEditingId(cc.id);
    setShowForm(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!formCode.trim() || !formDescription.trim()) return;

    if (editingId) {
      dispatch({
        type: "UPDATE_COST_CENTRE",
        costCentreId: editingId,
        updates: {
          code: formCode.trim().toUpperCase(),
          description: formDescription.trim(),
          type: formType,
        },
      });
    } else {
      dispatch({
        type: "ADD_COST_CENTRE",
        costCentre: {
          id: generateId("cc"),
          code: formCode.trim().toUpperCase(),
          description: formDescription.trim(),
          type: formType,
        },
      });
    }
    resetForm();
  }, [dispatch, editingId, formCode, formDescription, formType, resetForm]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  return (
    <Modal open={open} onClose={handleClose} width={560}>
      <ModalHeader
        title="Cost Centres"
        description="Finance codes for tagging actual costs by type."
        onClose={handleClose}
      />
      <ModalBody className="max-h-[65vh] overflow-y-auto">
        {showForm ? (
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">
              {editingId ? "Edit Cost Centre" : "New Cost Centre"}
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Code</label>
              <Input
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g., CC-CIVIL-001"
                className="font-mono"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">Uppercase, max 30 chars, unique</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Description</label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder='e.g., "Civil Division — Labour"'
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Type</label>
              <Select
                options={TYPE_OPTIONS}
                value={formType}
                onChange={(v) => setFormType(v as CostCentreType)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!formCode.trim() || !formDescription.trim()}
              >
                {editingId ? "Update" : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {costCentres.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-muted-foreground">No cost centres created yet.</p>
                <Button size="sm" onClick={openNew}>
                  <Plus size={14} /> Create Cost Centre
                </Button>
              </div>
            ) : (
              <>
                {costCentres.map((cc) => (
                  <div
                    key={cc.id}
                    className="flex items-center justify-between rounded-md border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium text-foreground">{cc.code}</span>
                      <span className="text-[13px] text-muted-foreground">{cc.description}</span>
                      <Badge variant={TYPE_BADGE_VARIANT[cc.type] ?? "secondary"}>
                        {TYPE_OPTIONS.find((t) => t.value === cc.type)?.label}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(cc)}>
                      <Pencil size={14} />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={openNew}>
                  <Plus size={14} /> Add Cost Centre
                </Button>
              </>
            )}
          </div>
        )}
      </ModalBody>
    </Modal>
  );
}

export { CostCentresModal };
