"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Plus,
  X,
  Search,
  ArrowLeft,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { SpotlightSearch } from "@/components/ui/spotlight-search";
import { useOrgSetup, generateId } from "./context";
import { type CostCenter } from "./types";
import { generateCostCenterCode } from "@/lib/validations/cost-center";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

/* ─────────────────────── Types ───────────────────────────────────── */

interface CostCenterModalProps {
  open: boolean;
  onClose: () => void;
}

/* ─────────────────────── CostCenterModal ────────────────────────── */

function CostCenterModal({ open, onClose }: CostCenterModalProps) {
  const { state, dispatch } = useOrgSetup();
  const { accessToken } = useAuth();
  const costCenters = Object.values(state.costCenters);

  const [selectedCCId, setSelectedCCId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [codeManual, setCodeManual] = useState(false);
  const [formDescription, setFormDescription] = useState("");

  // API state
  const [isSaving, setIsSaving] = useState(false);

  const selectedCC = selectedCCId ? state.costCenters[selectedCCId] : null;
  const showForm = isCreating || selectedCC !== null;

  /* ────────── Reset form ────────── */
  const resetForm = useCallback(() => {
    setFormName("");
    setFormCode("");
    setCodeManual(false);
    setFormDescription("");
  }, []);

  /* ────────── Open create ────────── */
  const openCreate = useCallback(() => {
    resetForm();
    setSelectedCCId(null);
    setIsCreating(true);
  }, [resetForm]);

  /* ────────── Open edit ────────── */
  const openEdit = useCallback(
    (cc: CostCenter) => {
      setFormName(cc.name);
      setFormCode(cc.code);
      setCodeManual(true);
      setFormDescription(cc.description);
      setSelectedCCId(cc.id);
      setIsCreating(false);
    },
    [],
  );

  /* ────────── Back to list ────────── */
  const backToList = useCallback(() => {
    setSelectedCCId(null);
    setIsCreating(false);
    resetForm();
  }, [resetForm]);

  /* ────────── Name change → auto-generate code ────────── */
  const handleNameChange = useCallback(
    (value: string) => {
      setFormName(value);
      if (!codeManual) {
        setFormCode(generateCostCenterCode(value));
      }
    },
    [codeManual],
  );

  /* ────────── Save cost center (context first, then API) ────────── */
  const handleSave = useCallback(async () => {
    if (!formName.trim() || !formCode.trim()) return;

    setIsSaving(true);
    const ccData = {
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      description: formDescription.trim(),
    };

    // Optimistic: update local context immediately
    const newCCId = generateId("cc");
    if (selectedCCId) {
      dispatch({
        type: "UPDATE_COST_CENTER",
        costCenterId: selectedCCId,
        updates: ccData,
      });
    } else {
      dispatch({
        type: "ADD_COST_CENTER",
        costCenter: { id: newCCId, ...ccData },
      });
    }
    backToList();

    // Best-effort: persist to API
    try {
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      };

      if (selectedCCId) {
        await fetch(`/api/cost-centers/${selectedCCId}`, {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify(ccData),
        });
      } else {
        const res = await fetch("/api/cost-centers", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(ccData),
        });
        if (res.ok) {
          const { costCenter: created } = await res.json();
          // Sync the server-generated ID back into context
          if (created?.id && created.id !== newCCId) {
            dispatch({ type: "REMOVE_COST_CENTER", costCenterId: newCCId });
            dispatch({
              type: "ADD_COST_CENTER",
              costCenter: { id: created.id, ...ccData },
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to persist cost center to API:", err);
    } finally {
      setIsSaving(false);
    }
  }, [
    formName, formCode, formDescription,
    selectedCCId, dispatch, backToList, accessToken,
  ]);

  /* ────────── Delete cost center ────────── */
  const confirmDelete = useCallback(async () => {
    if (!deleteTargetId) return;

    // Optimistic: remove from context immediately
    dispatch({ type: "REMOVE_COST_CENTER", costCenterId: deleteTargetId });
    if (selectedCCId === deleteTargetId) {
      backToList();
    }
    setDeleteTargetId(null);

    // Best-effort: persist to API
    try {
      await fetch(`/api/cost-centers/${deleteTargetId}`, {
        method: "DELETE",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
    } catch (err) {
      console.error("Failed to delete cost center from API:", err);
    }
  }, [deleteTargetId, dispatch, selectedCCId, backToList, accessToken]);

  /* ────────── Search ────────── */
  const filteredCCs = searchQuery.trim()
    ? costCenters.filter(
        (cc) =>
          cc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cc.code.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : costCenters;

  /* ────────── Close handler ────────── */
  const handleClose = useCallback(() => {
    resetForm();
    setSelectedCCId(null);
    setIsCreating(false);
    setShowSearch(false);
    setSearchQuery("");
    onClose();
  }, [resetForm, onClose]);

  /* ────────── Auto-enter create mode when no cost centers exist ────────── */
  useEffect(() => {
    if (open && costCenters.length === 0 && !isCreating) {
      openCreate();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <>
      {/* Main Cost Center Modal */}
      <Modal open={open} onClose={handleClose} width={900} className="h-[620px]">
        <div className="flex h-full flex-col" data-testid="cost-center-modal">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-foreground">Cost Centers</h2>
              <p className="text-[13px] text-muted-foreground">
                Define cost centers for your organisation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="icon"
                size="icon"
                onClick={() => setShowSearch(true)}
                aria-label="Search cost centers"
              >
                <Search size={16} />
              </Button>
              <Button
                variant="icon"
                size="icon"
                onClick={handleClose}
                aria-label="Close modal"
              >
                <X size={16} />
              </Button>
            </div>
          </div>

          {/* Body: Split panel */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Panel — Cost Centers List */}
            <div className="flex w-[320px] shrink-0 flex-col border-r border-border bg-muted">
              {/* Left header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-foreground">
                    All Cost Centers
                  </span>
                  <Badge className="text-[11px] px-2.5 py-0.5">
                    {costCenters.length}
                  </Badge>
                </div>
                <Button
                  variant="icon"
                  size="icon"
                  onClick={openCreate}
                  aria-label="Add new cost center"
                >
                  <Plus size={16} />
                </Button>
              </div>

              {/* Cost centers list */}
              <div className="flex flex-1 flex-col overflow-y-auto">
                {costCenters.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                    <Wallet size={32} className="text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No cost centers created yet
                    </p>
                  </div>
                ) : (
                  costCenters.map((cc) => (
                    <div
                      key={cc.id}
                      data-testid={`cc-item-${cc.id}`}
                      className={cn(
                        "group flex cursor-pointer items-center justify-between border-b border-border px-5 py-3",
                        "transition-colors duration-[var(--duration-fast)]",
                        selectedCCId === cc.id
                          ? "bg-background"
                          : "hover:bg-background/50",
                      )}
                      onClick={() => openEdit(cc)}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">
                          {cc.name}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {cc.code}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity duration-[var(--duration-fast)] hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetId(cc.id);
                        }}
                        aria-label={`Delete ${cc.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Panel — Cost Center Form */}
            <div className="flex flex-1 flex-col justify-between">
              {showForm ? (
                <>
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex flex-col gap-4">
                      {/* Form title */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={backToList}
                          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <ArrowLeft size={16} />
                        </button>
                        <span className="text-[15px] font-semibold text-foreground">
                          {isCreating ? "New Cost Center" : "Edit Cost Center"}
                        </span>
                      </div>

                      {/* Name */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-foreground">
                          Name
                        </label>
                        <Input
                          value={formName}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="e.g. Operations"
                          data-testid="cc-name-input"
                          autoFocus
                        />
                      </div>

                      {/* Code */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-foreground">
                          Code
                        </label>
                        <Input
                          value={formCode}
                          onChange={(e) => {
                            setFormCode(e.target.value.toUpperCase());
                            setCodeManual(true);
                          }}
                          placeholder="OPS-01"
                          className="font-mono"
                          data-testid="cc-code-input"
                        />
                        <p className="text-xs text-muted-foreground opacity-70">
                          Auto-suggested from name
                        </p>
                      </div>

                      {/* Description */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-foreground">
                          Description
                        </label>
                        <Textarea
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder="Optional description for this cost center"
                          data-testid="cc-description-input"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Form footer */}
                  <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                    <Button
                      variant="outline"
                      onClick={backToList}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={
                        !formName.trim() || !formCode.trim() || isSaving
                      }
                      data-testid="save-cc-btn"
                    >
                      {isSaving
                        ? "Saving..."
                        : selectedCCId
                          ? "Update Cost Center"
                          : "Save Cost Center"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-center px-8">
                    <Wallet
                      size={40}
                      className="text-muted-foreground"
                    />
                    <p className="text-sm text-muted-foreground">
                      Select a cost center to edit or view details
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Search Overlay Modal */}
      <CostCenterSearchModal
        open={showSearch}
        onClose={() => {
          setShowSearch(false);
          setSearchQuery("");
        }}
        costCenters={filteredCCs}
        onSelect={(cc) => {
          openEdit(cc);
          setShowSearch(false);
          setSearchQuery("");
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteCostCenterModal
        open={deleteTargetId !== null}
        name={
          deleteTargetId ? state.costCenters[deleteTargetId]?.name ?? "" : ""
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </>
  );
}

/* ─────────────────────── Search Modal ────────────────────────────── */

interface CostCenterSearchModalProps {
  open: boolean;
  onClose: () => void;
  costCenters: CostCenter[];
  onSelect: (cc: CostCenter) => void;
}

function CostCenterSearchModal({
  open,
  onClose,
  costCenters,
  onSelect,
}: CostCenterSearchModalProps) {
  return (
    <SpotlightSearch<CostCenter>
      open={open}
      onClose={onClose}
      placeholder="Search Cost Centers"
      items={costCenters}
      onSelect={onSelect}
      filterFn={(cc, q) =>
        cc.name.toLowerCase().includes(q.toLowerCase()) ||
        cc.code.toLowerCase().includes(q.toLowerCase())
      }
      renderItem={(cc, isActive) => (
        <>
          <Wallet size={14} className="shrink-0" />
          <div className="flex flex-1 flex-col min-w-0">
            <span className="text-sm font-medium truncate">
              {cc.name}
            </span>
            <span
              className={cn(
                "text-[11px] font-mono truncate",
                isActive
                  ? "text-primary-active-foreground/70"
                  : "text-muted-foreground",
              )}
            >
              {cc.code}
            </span>
          </div>
        </>
      )}
    />
  );
}

/* ─────────────────────── Delete Confirmation ─────────────────────── */

interface DeleteCostCenterModalProps {
  open: boolean;
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteCostCenterModal({
  open,
  name,
  onConfirm,
  onCancel,
}: DeleteCostCenterModalProps) {
  return (
    <Modal open={open} onClose={onCancel} width={400}>
      <div className="flex flex-col gap-4 p-6" data-testid="delete-cc-modal">
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold text-foreground">
            Delete Cost Center
          </h3>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">{name}</span>?
            This will also remove cost center assignments from all nodes.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            data-testid="confirm-delete-cc-btn"
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────── Exports ─────────────────────────────────── */

export { CostCenterModal, CostCenterSearchModal, DeleteCostCenterModal };
