"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Plus,
  X,
  Info,
  Search,
  ArrowLeft,
  Trash2,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useOrgSetup, generateId } from "./context";
import { type Role, type PayType, type RoleLevel } from "./types";
import { generateRoleCode } from "@/lib/validations/role";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

/* ─────────────────────── Constants ───────────────────────────────── */

const LEVEL_OPTIONS = [
  { value: "Junior", label: "Junior" },
  { value: "Mid", label: "Mid" },
  { value: "Senior", label: "Senior" },
  { value: "Lead", label: "Lead" },
  { value: "Principal", label: "Principal" },
];

const PAY_TYPE_ITEMS: { value: PayType; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "salaried", label: "Salaried" },
  { value: "contract", label: "Contract" },
];

/* ─────────────────────── Types ───────────────────────────────────── */

interface RolesModalProps {
  open: boolean;
  onClose: () => void;
}

/* ─────────────────────── RolesModal ──────────────────────────────── */

function RolesModal({ open, onClose }: RolesModalProps) {
  const { state, dispatch } = useOrgSetup();
  const { accessToken } = useAuth();
  const roles = Object.values(state.roles);

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [codeManual, setCodeManual] = useState(false);
  const [formLevel, setFormLevel] = useState<RoleLevel>("Mid");
  const [formPayType, setFormPayType] = useState<PayType>("hourly");
  const [formOvertimeEligible, setFormOvertimeEligible] = useState(true);
  const [formSkillTags, setFormSkillTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // API state
  const [isSaving, setIsSaving] = useState(false);

  const selectedRole = selectedRoleId ? state.roles[selectedRoleId] : null;
  const showForm = isCreating || selectedRole !== null;

  /* ────────── Reset form ────────── */
  const resetForm = useCallback(() => {
    setFormName("");
    setFormCode("");
    setCodeManual(false);
    setFormLevel("Mid");
    setFormPayType("hourly");
    setFormOvertimeEligible(true);
    setFormSkillTags([]);
    setTagInput("");
  }, []);

  /* ────────── Open create ────────── */
  const openCreate = useCallback(() => {
    resetForm();
    setSelectedRoleId(null);
    setIsCreating(true);
  }, [resetForm]);

  /* ────────── Open edit ────────── */
  const openEdit = useCallback(
    (role: Role) => {
      setFormName(role.name);
      setFormCode(role.code);
      setCodeManual(true);
      setFormLevel(role.level);
      setFormPayType(role.defaultPayType);
      setFormOvertimeEligible(role.overtimeEligible);
      setFormSkillTags([...role.skillTags]);
      setTagInput("");
      setSelectedRoleId(role.id);
      setIsCreating(false);
    },
    [],
  );

  /* ────────── Back to list ────────── */
  const backToList = useCallback(() => {
    setSelectedRoleId(null);
    setIsCreating(false);
    resetForm();
  }, [resetForm]);

  /* ────────── Name change → auto-generate code ────────── */
  const handleNameChange = useCallback(
    (value: string) => {
      setFormName(value);
      if (!codeManual) {
        setFormCode(generateRoleCode(value));
      }
    },
    [codeManual],
  );

  /* ────────── Tags ────────── */
  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
        e.preventDefault();
        const tag = tagInput.trim();
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

  /* ────────── Save role (context first, then API) ────────── */
  const handleSave = useCallback(async () => {
    if (!formName.trim() || !formCode.trim()) return;

    setIsSaving(true);
    const roleData = {
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      level: formLevel,
      defaultPayType: formPayType,
      overtimeEligible: formOvertimeEligible,
      skillTags: formSkillTags,
    };

    // Optimistic: update local context immediately
    const newRoleId = generateId("role");
    if (selectedRoleId) {
      dispatch({
        type: "UPDATE_ROLE",
        roleId: selectedRoleId,
        updates: roleData,
      });
    } else {
      dispatch({
        type: "ADD_ROLE",
        role: { id: newRoleId, ...roleData },
      });
    }
    backToList();

    // Best-effort: persist to API
    try {
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      };

      if (selectedRoleId) {
        await fetch(`/api/roles/${selectedRoleId}`, {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify(roleData),
        });
      } else {
        const res = await fetch("/api/roles", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(roleData),
        });
        if (res.ok) {
          const { role: created } = await res.json();
          // Sync the server-generated ID back into context
          if (created?.id && created.id !== newRoleId) {
            dispatch({ type: "REMOVE_ROLE", roleId: newRoleId });
            dispatch({
              type: "ADD_ROLE",
              role: { id: created.id, ...roleData },
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to persist role to API:", err);
    } finally {
      setIsSaving(false);
    }
  }, [
    formName, formCode, formLevel, formPayType, formOvertimeEligible,
    formSkillTags, selectedRoleId, dispatch, backToList, accessToken,
  ]);

  /* ────────── Delete role ────────── */
  const confirmDelete = useCallback(async () => {
    if (!deleteTargetId) return;

    // Optimistic: remove from context immediately
    dispatch({ type: "REMOVE_ROLE", roleId: deleteTargetId });
    if (selectedRoleId === deleteTargetId) {
      backToList();
    }
    setDeleteTargetId(null);

    // Best-effort: persist to API
    try {
      await fetch(`/api/roles/${deleteTargetId}`, {
        method: "DELETE",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
    } catch (err) {
      console.error("Failed to delete role from API:", err);
    }
  }, [deleteTargetId, dispatch, selectedRoleId, backToList, accessToken]);

  /* ────────── Search ────────── */
  const filteredRoles = searchQuery.trim()
    ? roles.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.code.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : roles;

  /* ────────── Close handler ────────── */
  const handleClose = useCallback(() => {
    resetForm();
    setSelectedRoleId(null);
    setIsCreating(false);
    setShowSearch(false);
    setSearchQuery("");
    onClose();
  }, [resetForm, onClose]);

  /* ────────── Auto-enter create mode when no roles exist ────────── */
  useEffect(() => {
    if (open && roles.length === 0 && !isCreating) {
      openCreate();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <>
      {/* Main Roles Modal */}
      <Modal open={open} onClose={handleClose} width={1152} className="h-[720px]">
        <div className="flex h-full flex-col" data-testid="roles-modal">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-foreground">Roles</h2>
              <p className="text-[13px] text-muted-foreground">
                Define job roles for your organisation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="icon"
                size="icon"
                onClick={() => setShowSearch(true)}
                aria-label="Search roles"
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
            {/* Left Panel — Roles List */}
            <div className="flex w-[400px] shrink-0 flex-col border-r border-border bg-muted">
              {/* Left header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-foreground">
                    All Roles
                  </span>
                  <Badge className="text-[11px] px-2.5 py-0.5">
                    {roles.length}
                  </Badge>
                </div>
                <Button
                  variant="icon"
                  size="icon"
                  onClick={openCreate}
                  aria-label="Add new role"
                >
                  <Plus size={16} />
                </Button>
              </div>

              {/* Roles list */}
              <div className="flex flex-1 flex-col overflow-y-auto">
                {roles.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                    <Briefcase size={32} className="text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No roles created yet
                    </p>
                  </div>
                ) : (
                  roles.map((role) => (
                    <div
                      key={role.id}
                      data-testid={`role-item-${role.id}`}
                      className={cn(
                        "group flex cursor-pointer items-center justify-between border-b border-border px-5 py-3",
                        "transition-colors duration-[var(--duration-fast)]",
                        selectedRoleId === role.id
                          ? "bg-background"
                          : "hover:bg-background/50",
                      )}
                      onClick={() => openEdit(role)}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">
                          {role.name}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {role.code}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity duration-[var(--duration-fast)] hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetId(role.id);
                        }}
                        aria-label={`Delete ${role.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Panel — Role Form */}
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
                          {isCreating ? "New Role" : "Edit Role"}
                        </span>
                      </div>

                      {/* Role Name */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-foreground">
                          Role Name
                        </label>
                        <Input
                          value={formName}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="e.g. Senior Painter"
                          data-testid="role-name-input"
                          autoFocus
                        />
                      </div>

                      {/* Role Code */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-foreground">
                          Role Code
                        </label>
                        <Input
                          value={formCode}
                          onChange={(e) => {
                            setFormCode(e.target.value.toUpperCase());
                            setCodeManual(true);
                          }}
                          placeholder="PNTR-SR"
                          className="font-mono"
                          data-testid="role-code-input"
                        />
                        <p className="text-xs text-muted-foreground opacity-70">
                          Auto-suggested from name
                        </p>
                      </div>

                      {/* Level */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-foreground">
                          Level
                        </label>
                        <Select
                          options={LEVEL_OPTIONS}
                          value={formLevel}
                          onChange={(v) => setFormLevel(v as RoleLevel)}
                        />
                      </div>

                      {/* Pay Type — radio-style buttons */}
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">
                          Default Pay Type
                        </label>
                        <div className="flex gap-3">
                          {PAY_TYPE_ITEMS.map((item) => (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => setFormPayType(item.value)}
                              className={cn(
                                "flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-[13px] font-medium transition-colors duration-[var(--duration-fast)] cursor-pointer",
                                formPayType === item.value
                                  ? "border-foreground bg-foreground text-primary-foreground"
                                  : "border-border bg-background text-foreground hover:bg-muted-hover",
                              )}
                            >
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  formPayType === item.value
                                    ? "bg-primary-foreground"
                                    : "border border-border",
                                )}
                              />
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Overtime Eligible */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground">
                            Overtime Eligible
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Allow overtime tracking for this role
                          </span>
                        </div>
                        <Toggle
                          checked={formOvertimeEligible}
                          onChange={setFormOvertimeEligible}
                        />
                      </div>

                      {/* Skill Tags */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-foreground">
                          Skill Tags
                        </label>
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagKeyDown}
                          placeholder="Type + Enter to add tags"
                          data-testid="skill-tags-input"
                        />
                        {formSkillTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {formSkillTags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="gap-1"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => removeTag(tag)}
                                  className="ml-0.5 cursor-pointer text-muted-foreground hover:text-foreground"
                                >
                                  <X size={10} />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Info callout */}
                      <div className="flex items-start gap-2.5 rounded-md bg-info-bg p-3">
                        <Info
                          size={16}
                          className="mt-0.5 shrink-0 text-info"
                        />
                        <p className="text-xs leading-relaxed text-info-foreground">
                          Rates for this role are set inside each division. The
                          same role can have different rates in different
                          divisions.
                        </p>
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
                      data-testid="save-role-btn"
                    >
                      {isSaving
                        ? "Saving..."
                        : selectedRoleId
                          ? "Update Role"
                          : "Save Role"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-center px-8">
                    <Briefcase
                      size={40}
                      className="text-muted-foreground"
                    />
                    <p className="text-sm text-muted-foreground">
                      Select a role to edit or check more information about it
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Search Overlay Modal */}
      <RolesSearchModal
        open={showSearch}
        onClose={() => {
          setShowSearch(false);
          setSearchQuery("");
        }}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        roles={filteredRoles}
        onSelect={(role) => {
          openEdit(role);
          setShowSearch(false);
          setSearchQuery("");
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteRoleModal
        open={deleteTargetId !== null}
        roleName={
          deleteTargetId ? state.roles[deleteTargetId]?.name ?? "" : ""
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </>
  );
}

/* ─────────────────────── Search Modal ────────────────────────────── */

interface RolesSearchModalProps {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  roles: Role[];
  onSelect: (role: Role) => void;
}

function RolesSearchModal({
  open,
  onClose,
  query,
  onQueryChange,
  roles,
  onSelect,
}: RolesSearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, roles.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && roles.length > 0) {
        e.preventDefault();
        onSelect(roles[activeIndex]);
      }
    },
    [roles, activeIndex, onSelect],
  );

  return (
    <Modal open={open} onClose={onClose} width={480}>
      <div className="flex flex-col" data-testid="roles-search-modal">
        {/* Search bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search size={16} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search Roles"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {query.trim() && roles.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {!query.trim() && (
            <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recently Added
            </div>
          )}

          {roles.map((role, idx) => (
            <button
              key={role.id}
              type="button"
              data-testid={`search-result-${role.id}`}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors duration-[var(--duration-fast)]",
                idx === activeIndex
                  ? "bg-primary-active text-primary-active-foreground"
                  : "hover:bg-muted-hover",
              )}
              onClick={() => onSelect(role)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <Briefcase size={14} className="shrink-0" />
              <div className="flex flex-1 flex-col min-w-0">
                <span className="text-sm font-medium truncate">
                  {role.name}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-mono truncate",
                    idx === activeIndex
                      ? "text-primary-active-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  {role.code}
                </span>
              </div>
              <Badge
                variant="success"
                className="shrink-0 text-[10px]"
              >
                {LEVEL_OPTIONS.find((l) => l.value === role.level)?.label ??
                  role.level}
              </Badge>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        {roles.length > 0 && (
          <div className="flex items-center gap-4 border-t border-border px-4 py-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <kbd className="rounded-[3px] border border-border bg-muted px-1 py-px text-[9px] font-medium">
                ↑↓
              </kbd>
              <span className="text-[10px]">navigate</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <kbd className="rounded-[3px] border border-border bg-muted px-1 py-px text-[9px] font-medium">
                ↵
              </kbd>
              <span className="text-[10px]">select</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ─────────────────────── Delete Confirmation ─────────────────────── */

interface DeleteRoleModalProps {
  open: boolean;
  roleName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteRoleModal({
  open,
  roleName,
  onConfirm,
  onCancel,
}: DeleteRoleModalProps) {
  return (
    <Modal open={open} onClose={onCancel} width={400}>
      <div className="flex flex-col gap-4 p-6" data-testid="delete-role-modal">
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold text-foreground">
            Delete Role
          </h3>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">{roleName}</span>?
            This will also remove all role assignments in divisions.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            data-testid="confirm-delete-btn"
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────── Exports ─────────────────────────────────── */

export { RolesModal, RolesSearchModal, DeleteRoleModal };
