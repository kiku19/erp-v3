"use client";

import { useState, useCallback } from "react";
import { Plus, Pencil, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalHeader, ModalBody } from "@/components/ui/modal";
import { useOrgSetup, generateId } from "./context";
import { type Role, type PayType, type RoleLevel } from "./types";

const LEVEL_OPTIONS = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "manager", label: "Manager" },
];

const PAY_TYPE_OPTIONS = [
  { value: "hourly", label: "Hourly" },
  { value: "salaried", label: "Salaried" },
  { value: "contract", label: "Contract" },
];

interface RolesModalProps {
  open: boolean;
  onClose: () => void;
}

function RolesModal({ open, onClose }: RolesModalProps) {
  const { state, dispatch } = useOrgSetup();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [codeManual, setCodeManual] = useState(false);
  const [formLevel, setFormLevel] = useState<RoleLevel>("mid");
  const [formPayType, setFormPayType] = useState<PayType>("hourly");
  const [formOvertimeEligible, setFormOvertimeEligible] = useState(true);
  const [formSkillTags, setFormSkillTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const roles = Object.values(state.roles);

  const resetForm = useCallback(() => {
    setFormName("");
    setFormCode("");
    setCodeManual(false);
    setFormLevel("mid");
    setFormPayType("hourly");
    setFormOvertimeEligible(true);
    setFormSkillTags([]);
    setTagInput("");
    setEditingId(null);
    setShowForm(false);
  }, []);

  const openNew = useCallback(() => {
    resetForm();
    setShowForm(true);
  }, [resetForm]);

  const openEdit = useCallback((role: Role) => {
    setFormName(role.name);
    setFormCode(role.code);
    setCodeManual(true);
    setFormLevel(role.level);
    setFormPayType(role.defaultPayType);
    setFormOvertimeEligible(role.overtimeEligible);
    setFormSkillTags([...role.skillTags]);
    setEditingId(role.id);
    setShowForm(true);
  }, []);

  const handleNameChange = useCallback(
    (value: string) => {
      setFormName(value);
      if (!codeManual) {
        const generated = value
          .split(/\s+/)
          .map((w) => w.slice(0, 3).toUpperCase())
          .join("-")
          .slice(0, 20);
        setFormCode(generated);
      }
    },
    [codeManual],
  );

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
        e.preventDefault();
        const tag = tagInput.trim().toLowerCase().replace(/\s+/g, "_");
        if (!formSkillTags.includes(tag)) {
          setFormSkillTags((prev) => [...prev, tag]);
        }
        setTagInput("");
      }
    },
    [tagInput, formSkillTags],
  );

  const removeTag = useCallback((tag: string) => {
    setFormSkillTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleSave = useCallback(() => {
    if (!formName.trim() || !formCode.trim()) return;

    if (editingId) {
      dispatch({
        type: "UPDATE_ROLE",
        roleId: editingId,
        updates: {
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          level: formLevel,
          defaultPayType: formPayType,
          overtimeEligible: formOvertimeEligible,
          skillTags: formSkillTags,
        },
      });
    } else {
      dispatch({
        type: "ADD_ROLE",
        role: {
          id: generateId("role"),
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          level: formLevel,
          defaultPayType: formPayType,
          overtimeEligible: formOvertimeEligible,
          skillTags: formSkillTags,
        },
      });
    }
    resetForm();
  }, [dispatch, editingId, formName, formCode, formLevel, formPayType, formOvertimeEligible, formSkillTags, resetForm]);

  const getUsageCount = useCallback(
    (roleId: string) =>
      Object.values(state.nodes).filter((n) =>
        n.assignedRoles.some((r) => r.roleId === roleId),
      ).length,
    [state.nodes],
  );

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  return (
    <Modal open={open} onClose={handleClose} width={560}>
      <ModalHeader
        title="Role Catalogue"
        description="Define job roles for your company. Rates are set per division — not here."
        onClose={handleClose}
      />
      <ModalBody className="max-h-[65vh] overflow-y-auto">
        {showForm ? (
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">
              {editingId ? "Edit Role" : "New Role"}
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Role Name</label>
              <Input
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder='e.g., "Senior Painter"'
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Role Code</label>
              <Input
                value={formCode}
                onChange={(e) => {
                  setFormCode(e.target.value.toUpperCase());
                  setCodeManual(true);
                }}
                placeholder="Auto-generated"
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">Unique, max 20 chars, no spaces</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Level</label>
              <Select options={LEVEL_OPTIONS} value={formLevel} onChange={(v) => setFormLevel(v as RoleLevel)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Default Pay Type</label>
              <Select options={PAY_TYPE_OPTIONS} value={formPayType} onChange={(v) => setFormPayType(v as PayType)} />
              <p className="text-[11px] text-muted-foreground">This is the default — overridable per person</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Toggle
                checked={formOvertimeEligible}
                onChange={setFormOvertimeEligible}
                label="Overtime Eligible"
              />
              <p className="text-[11px] text-muted-foreground">
                If off, overtime hours are tracked but the OT rate field is hidden.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Skill Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-1">
                {formSkillTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={() => removeTag(tag)}>
                      <X size={10} />
                    </Button>
                  </Badge>
                ))}
              </div>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="e.g., exterior_painting, scaffolding"
              />
            </div>

            <div className="flex items-center gap-2 rounded-md bg-info-bg p-3">
              <Info size={14} className="shrink-0 text-info" />
              <p className="text-[12px] text-info-foreground">
                Rates for this role are set inside each division&apos;s Settings tab.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={!formName.trim() || !formCode.trim()}>
                {editingId ? "Update Role" : "Save Role"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {roles.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-muted-foreground">No roles created yet.</p>
                <Button size="sm" onClick={openNew}>
                  <Plus size={14} /> Create Role
                </Button>
              </div>
            ) : (
              <>
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between rounded-md border border-border p-3"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{role.name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{role.code}</span>
                      </div>
                      <span className="text-[12px] text-muted-foreground">
                        {LEVEL_OPTIONS.find((l) => l.value === role.level)?.label} · {PAY_TYPE_OPTIONS.find((p) => p.value === role.defaultPayType)?.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Used by: {getUsageCount(role.id)} nodes
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(role)}>
                      <Pencil size={14} />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={openNew}>
                  <Plus size={14} /> Add Role
                </Button>
              </>
            )}
          </div>
        )}
      </ModalBody>
    </Modal>
  );
}

export { RolesModal };
