"use client";

import { useState, useCallback, useEffect, useMemo, useRef, memo } from "react";
import {
  Plus, Users, Loader2, Trash2, ArrowLeft,
  Search, ChevronLeft, ChevronRight,
  Mail, Calendar, IndianRupee, Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalHeader } from "@/components/ui/modal";
import { SpotlightSearch } from "@/components/ui/spotlight-search";
import { useOrgApi } from "@/hooks/use-org-api";
import { useOrgSetup } from "./context";
import { cn } from "@/lib/utils";
import { type PayType, type EmploymentType, type Role } from "./types";

/* ─────────────────────── Constants ───────────────────────────────── */

const PAGE_SIZE = 20;

const PAY_TYPE_OPTIONS = [
  { value: "hourly", label: "Hourly" },
  { value: "salaried", label: "Salaried" },
  { value: "contract", label: "Contract" },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "consultant", label: "Consultant" },
];

/* ─────────────────────── Types ───────────────────────────────────── */

interface PersonRecord {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  nodeId: string | null;
  roleId: string | null;
  payType: string;
  standardRate: number | null;
  overtimeRate: number | null;
  overtimePay: boolean;
  monthlySalary: number | null;
  dailyAllocation: number | null;
  contractAmount: number | null;
  employmentType: string;
  joinDate: string | null;
  photoUrl: string | null;
  node: { id: string; name: string } | null;
}

interface PeopleModalProps {
  open: boolean;
  onClose: () => void;
}

/* ─────────────────────── Pay summary helper ─────────────────────── */

function formatPaySummary(person: PersonRecord): string {
  if (person.payType === "hourly" && person.standardRate != null) {
    return `₹${person.standardRate.toLocaleString()}/hr`;
  }
  if (person.payType === "salaried" && person.monthlySalary != null) {
    return `₹${person.monthlySalary.toLocaleString()}/mo`;
  }
  if (person.payType === "contract" && person.contractAmount != null) {
    return `₹${person.contractAmount.toLocaleString()}`;
  }
  return "—";
}

/* ─────────────────────── Person Row (memoized) ─────────────────── */

interface PersonRowProps {
  person: PersonRecord;
  role: Role | null;
  isSelected: boolean;
  isDeleting: boolean;
  onSelect: (person: PersonRecord) => void;
  onDeleteRequest: (personId: string) => void;
  onDeleteConfirm: (personId: string) => void;
  onDeleteCancel: () => void;
}

const PersonRow = memo(function PersonRow({
  person, role, isSelected, isDeleting,
  onSelect, onDeleteRequest, onDeleteConfirm, onDeleteCancel,
}: PersonRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(person)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(person); } }}
      className={cn(
        "group/person flex items-start justify-between px-4 py-3 border-b border-border last:border-0 cursor-pointer transition-colors duration-[var(--duration-fast)]",
        isSelected
          ? "bg-primary-active text-primary-active-foreground"
          : "hover:bg-muted-hover",
      )}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0 text-left">
        {/* Avatar */}
        <div className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full shrink-0 mt-0.5",
          isSelected ? "bg-primary-active-foreground/15" : "bg-muted",
        )}>
          <span className={cn(
            "text-[10px] font-semibold",
            isSelected ? "text-primary-active-foreground" : "text-muted-foreground",
          )}>
            {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {/* Row 1: Name + Employee ID */}
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[13px] font-medium truncate",
              isSelected ? "text-primary-active-foreground" : "text-foreground",
            )}>
              {person.name}
            </span>
            <span className={cn(
              "text-[10px] font-mono shrink-0",
              isSelected ? "text-primary-active-foreground/70" : "text-muted-foreground",
            )}>
              {person.employeeId}
            </span>
          </div>

          {/* Row 2: Email */}
          <div className="flex items-center gap-1.5">
            <Mail size={10} className={cn(
              "shrink-0",
              isSelected ? "text-primary-active-foreground/60" : "text-muted-foreground",
            )} />
            <span className={cn(
              "text-[11px] truncate",
              isSelected ? "text-primary-active-foreground/70" : "text-muted-foreground",
            )}>
              {person.email}
            </span>
          </div>

          {/* Row 3: Badges (Node, Role, Pay/Employment) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              variant="secondary"
              className={cn(
                "text-[9px] px-1.5 py-0",
                isSelected ? "bg-primary-active-foreground/15 text-primary-active-foreground" : "",
              )}
            >
              {person.node?.name ?? "Unassigned"}
            </Badge>
            {role && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[9px] px-1.5 py-0",
                  isSelected ? "bg-primary-active-foreground/15 text-primary-active-foreground" : "",
                )}
              >
                {role.name}
              </Badge>
            )}
            <span className={cn(
              "text-[9px]",
              isSelected ? "text-primary-active-foreground/60" : "text-muted-foreground",
            )}>
              {person.payType} · {person.employmentType}
            </span>
          </div>

          {/* Row 4: Pay + Join date */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <IndianRupee size={10} className={cn(
                "shrink-0",
                isSelected ? "text-primary-active-foreground/60" : "text-muted-foreground",
              )} />
              <span className={cn(
                "text-[10px] font-medium",
                isSelected ? "text-primary-active-foreground/80" : "text-foreground",
              )}>
                {formatPaySummary(person)}
              </span>
            </div>
            {person.joinDate && (
              <div className="flex items-center gap-1">
                <Calendar size={10} className={cn(
                  "shrink-0",
                  isSelected ? "text-primary-active-foreground/60" : "text-muted-foreground",
                )} />
                <span className={cn(
                  "text-[10px]",
                  isSelected ? "text-primary-active-foreground/70" : "text-muted-foreground",
                )}>
                  {new Date(person.joinDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete */}
      <div className="flex items-center gap-0.5 shrink-0 mt-1" onClick={(e) => e.stopPropagation()}>
        {isDeleting ? (
          <>
            <Button variant="destructive" size="sm" className="h-6 text-[11px] px-2" onClick={() => onDeleteConfirm(person.id)}>
              Delete
            </Button>
            <Button variant="outline" size="sm" className="h-6 text-[11px] px-2" onClick={onDeleteCancel}>
              No
            </Button>
          </>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDeleteRequest(person.id); }}
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-md shrink-0 opacity-0 group-hover/person:opacity-100 transition-opacity duration-[var(--duration-fast)] cursor-pointer",
              isSelected
                ? "text-primary-active-foreground/70 hover:text-primary-active-foreground hover:bg-primary-active-foreground/10"
                : "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            )}
            aria-label={`Delete ${person.name}`}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
});

/* ─────────────────────── Component ───────────────────────────────── */

function PeopleModal({ open, onClose }: PeopleModalProps) {
  const { state } = useOrgSetup();
  const { fetchAllPeople, createPerson, updatePerson, deletePerson } = useOrgApi();

  // Data state
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Spotlight search
  const [spotlightOpen, setSpotlightOpen] = useState(false);

  // Selection & form state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formNodeId, setFormNodeId] = useState("");
  const [formRoleId, setFormRoleId] = useState("");
  const [formPayType, setFormPayType] = useState<PayType>("hourly");
  const [formStdRate, setFormStdRate] = useState<string>("");
  const [formOtRate, setFormOtRate] = useState<string>("");
  const [formOtPay, setFormOtPay] = useState(true);
  const [formSalary, setFormSalary] = useState<string>("");
  const [formContractAmt, setFormContractAmt] = useState<string>("");
  const [formEmploymentType, setFormEmploymentType] = useState<EmploymentType>("full-time");
  const [formJoinDate, setFormJoinDate] = useState("");

  // Abort controller ref — cancels in-flight fetches on unmount / re-fetch
  const abortRef = useRef<AbortController | null>(null);

  const selectedPerson = useMemo(
    () => (selectedId ? people.find((p) => p.id === selectedId) ?? null : null),
    [selectedId, people],
  );
  const showForm = isCreating || selectedPerson !== null;

  const tailNodeIds = useMemo(
    () => new Set(Object.values(state.nodes).filter((n) => n.children.length === 0).map((n) => n.id)),
    [state.nodes],
  );

  const nodeOptions = useMemo(
    () => [
      { value: "", label: "Unassigned" },
      ...Object.values(state.nodes)
        .filter((n) => tailNodeIds.has(n.id))
        .map((n) => ({ value: n.id, label: n.name })),
    ],
    [state.nodes, tailNodeIds],
  );

  const roleOptions = useMemo(
    () => [
      { value: "", label: "No role" },
      ...Object.values(state.roles).map((r) => ({ value: r.id, label: `${r.name} (${r.code})` })),
    ],
    [state.roles],
  );

  /* ─── Data Loading (with AbortController) ─── */

  const loadPeople = useCallback(
    async (pageNum: number): Promise<number> => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      try {
        const result = await fetchAllPeople({
          limit: PAGE_SIZE,
          offset: pageNum * PAGE_SIZE,
        });
        // Only apply if this request wasn't aborted
        if (!controller.signal.aborted) {
          setPeople(result.people);
          setTotal(result.total);
        }
        return result.people.length;
      } catch (err) {
        if (!controller.signal.aborted) {
          setPeople([]);
          setTotal(0);
        }
        return 0;
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [fetchAllPeople],
  );

  // Stable ref so effects don't re-trigger on token refresh
  const loadPeopleRef = useRef(loadPeople);
  loadPeopleRef.current = loadPeople;

  // Load on open
  useEffect(() => {
    if (open) {
      setSelectedId(null);
      setIsCreating(false);
      setPage(0);
      setSaveError(null);
      loadPeopleRef.current(0).then((count) => {
        if (count === 0) setIsCreating(true);
      });
    }
    return () => {
      // Cancel in-flight requests when modal closes
      abortRef.current?.abort();
    };
  }, [open]);

  // Load when page changes (skip initial load which is handled above)
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (open) {
      loadPeopleRef.current(page);
    }
  }, [page, open]);

  // Reset first-mount flag when modal closes
  useEffect(() => {
    if (!open) isFirstMount.current = true;
  }, [open]);

  /* ─── Spotlight search handler ─── */

  const handleSpotlightSearch = useCallback(
    async (query: string): Promise<PersonRecord[]> => {
      const result = await fetchAllPeople({ search: query, limit: 20 });
      return result.people;
    },
    [fetchAllPeople],
  );

  const handleSpotlightSelect = useCallback(
    (person: PersonRecord) => {
      setSpotlightOpen(false);
      openEdit(person);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /* ─── Pagination ─── */

  const goNextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages - 1));
  }, [totalPages]);

  const goPrevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 0));
  }, []);

  /* ─── Form Helpers ─── */

  const resetForm = useCallback(() => {
    setFormName("");
    setFormEmployeeId("");
    setFormEmail("");
    setFormNodeId("");
    setFormRoleId("");
    setFormPayType("hourly");
    setFormStdRate("");
    setFormOtRate("");
    setFormOtPay(true);
    setFormSalary("");
    setFormContractAmt("");
    setFormEmploymentType("full-time");
    setFormJoinDate("");
    setSaveError(null);
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setSelectedId(null);
    setIsCreating(true);
  }, [resetForm]);

  const openEdit = useCallback(
    (person: PersonRecord) => {
      setFormName(person.name);
      setFormEmployeeId(person.employeeId);
      setFormEmail(person.email);
      setFormNodeId(person.nodeId ?? "");
      setFormRoleId(person.roleId ?? "");
      setFormPayType(person.payType as PayType);
      setFormStdRate(person.standardRate?.toString() ?? "");
      setFormOtRate(person.overtimeRate?.toString() ?? "");
      setFormOtPay(person.overtimePay);
      setFormSalary(person.monthlySalary?.toString() ?? "");
      setFormContractAmt(person.contractAmount?.toString() ?? "");
      setFormEmploymentType(person.employmentType as EmploymentType);
      setFormJoinDate(person.joinDate ?? "");
      setSelectedId(person.id);
      setIsCreating(false);
      setSaveError(null);
    },
    [],
  );

  const backToList = useCallback(() => {
    setSelectedId(null);
    setIsCreating(false);
    resetForm();
  }, [resetForm]);

  const handlePayTypeChange = useCallback((payType: PayType) => {
    setFormPayType(payType);
    if (payType === "contract") setFormEmploymentType("contract");
  }, []);

  const handleRoleChange = useCallback(
    (roleId: string) => {
      setFormRoleId(roleId);
      const role = state.roles[roleId];
      if (role) {
        handlePayTypeChange(role.defaultPayType);
        setFormOtPay(role.overtimeEligible);
      }
    },
    [state.roles, handlePayTypeChange],
  );

  /* ─── Save ─── */

  const handleSave = useCallback(async () => {
    if (!formName.trim() || !formEmployeeId.trim() || !formEmail.trim()) return;

    // Client-side validation
    if (formEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail.trim())) {
      setSaveError("Please enter a valid email address");
      return;
    }

    const numericStdRate = formStdRate ? Number(formStdRate) : null;
    const numericOtRate = formOtRate ? Number(formOtRate) : null;
    const numericSalary = formSalary ? Number(formSalary) : null;
    const numericContract = formContractAmt ? Number(formContractAmt) : null;

    if ((numericStdRate !== null && numericStdRate < 0) ||
        (numericOtRate !== null && numericOtRate < 0) ||
        (numericSalary !== null && numericSalary < 0) ||
        (numericContract !== null && numericContract < 0)) {
      setSaveError("Rates and amounts must be non-negative");
      return;
    }

    const data = {
      nodeId: formNodeId || null,
      name: formName.trim(),
      employeeId: formEmployeeId.trim(),
      email: formEmail.trim(),
      roleId: formRoleId || null,
      payType: formPayType,
      standardRate: numericStdRate,
      overtimeRate: numericOtRate,
      overtimePay: formOtPay,
      monthlySalary: numericSalary,
      dailyAllocation: numericSalary ? Math.round(numericSalary / 26) : null,
      contractAmount: numericContract,
      employmentType: formEmploymentType,
      joinDate: formJoinDate || null,
      photoUrl: null,
    };

    setIsSaving(true);
    setSaveError(null);

    try {
      if (selectedId) {
        await updatePerson(selectedId, data);
      } else {
        await createPerson(data);
      }
      await loadPeopleRef.current(page);
      backToList();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save person");
    } finally {
      setIsSaving(false);
    }
  }, [
    createPerson, updatePerson, page,
    selectedId, formName, formEmployeeId, formEmail, formNodeId,
    formRoleId, formPayType, formStdRate, formOtRate, formOtPay,
    formSalary, formContractAmt, formEmploymentType, formJoinDate, backToList,
  ]);

  /* ─── Delete ─── */

  const handleDelete = useCallback(
    async (personId: string) => {
      setDeleteTargetId(null);
      try {
        await deletePerson(personId);
        if (selectedId === personId) backToList();
        await loadPeopleRef.current(page);
      } catch {
        setSaveError("Failed to delete person");
      }
    },
    [deletePerson, page, selectedId, backToList],
  );

  /* ─── Selected role for form ─── */
  const selectedRole = formRoleId ? state.roles[formRoleId] : null;

  /* ─── Stable callbacks for PersonRow ─── */
  const handleDeleteRequest = useCallback((personId: string) => {
    setDeleteTargetId(personId);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setDeleteTargetId(null);
  }, []);

  /* ─── Spotlight renderItem ─── */
  const renderSpotlightItem = useCallback(
    (person: PersonRecord) => (
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted shrink-0">
          <span className="text-[9px] font-semibold text-muted-foreground">
            {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[13px] font-medium text-foreground truncate">{person.name}</span>
          <span className="text-[11px] text-muted-foreground truncate">
            {person.employeeId} · {person.email}
          </span>
        </div>
      </div>
    ),
    [],
  );

  return (
    <>
      <Modal open={open} onClose={onClose} width={1200} className="h-[85vh]">
        <ModalHeader
          title="People"
          description={`${total} people across all nodes`}
          onClose={onClose}
          actions={
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setSpotlightOpen(true)}
                data-testid="people-spotlight-trigger"
                aria-label="Search people"
              >
                <Search size={14} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={openCreate}
                aria-label="Add person"
              >
                <Plus size={14} />
              </Button>
            </>
          }
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Panel — List */}
          <div data-testid="people-modal-list" className="w-[520px] border-r border-border flex flex-col shrink-0">
            {/* People List */}
            <div className="flex-1 min-h-0 overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : people.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                  <Users size={24} className="text-muted-foreground" />
                  <p className="text-[12px] text-muted-foreground">
                    No people added yet
                  </p>
                </div>
              ) : (
                people.map((person) => (
                  <PersonRow
                    key={person.id}
                    person={person}
                    role={person.roleId ? state.roles[person.roleId] ?? null : null}
                    isSelected={selectedId === person.id}
                    isDeleting={deleteTargetId === person.id}
                    onSelect={openEdit}
                    onDeleteRequest={handleDeleteRequest}
                    onDeleteConfirm={handleDelete}
                    onDeleteCancel={handleDeleteCancel}
                  />
                ))
              )}
            </div>

            {/* Pagination Footer */}
            {total > 0 && (
              <div data-testid="people-pagination" className="flex items-center justify-between px-4 py-2 border-t border-border shrink-0">
                <span className="text-[11px] text-muted-foreground">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page === 0}
                    onClick={goPrevPage}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </Button>
                  <span className="text-[11px] text-muted-foreground px-2">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= totalPages - 1}
                    onClick={goNextPage}
                    aria-label="Next page"
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel — Form */}
          <div data-testid="people-modal-detail" className="flex-1 flex flex-col overflow-hidden bg-background">
            {showForm ? (
              <div className="flex flex-col gap-4 p-5 overflow-auto h-full">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={backToList}
                    className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted-hover cursor-pointer transition-colors duration-[var(--duration-fast)]"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <h3 className="text-sm font-semibold text-foreground">
                    {selectedId ? "Edit Person" : "Add Person"}
                  </h3>
                </div>

                {/* Required fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-foreground">Full Name *</label>
                    <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Full name" autoFocus />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-foreground">Employee ID *</label>
                    <Input value={formEmployeeId} onChange={(e) => setFormEmployeeId(e.target.value)} placeholder="EMP-001" className="font-mono" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-foreground">Email *</label>
                    <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="name@company.com" />
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Assignment & classification */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-foreground">OBS Node</label>
                    <Select options={nodeOptions} value={formNodeId} onChange={setFormNodeId} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-foreground">Role</label>
                    <Select options={roleOptions} value={formRoleId} onChange={handleRoleChange} placeholder="No role" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-foreground">Pay Type</label>
                    <Select options={PAY_TYPE_OPTIONS} value={formPayType} onChange={(v) => handlePayTypeChange(v as PayType)} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-foreground">Employment Type</label>
                    <Select options={EMPLOYMENT_TYPE_OPTIONS} value={formEmploymentType} onChange={(v) => setFormEmploymentType(v as EmploymentType)} disabled={formPayType === "contract"} />
                  </div>
                </div>

                {/* Conditional pay fields */}
                {formPayType === "hourly" && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-medium text-foreground">Standard Rate (₹/hr)</label>
                        <Input type="number" min="0" value={formStdRate} onChange={(e) => setFormStdRate(e.target.value)} placeholder="0.00" />
                      </div>
                      {selectedRole?.overtimeEligible !== false && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-medium text-foreground">Overtime Rate (₹/hr)</label>
                          <Input type="number" min="0" value={formOtRate} onChange={(e) => setFormOtRate(e.target.value)} placeholder="0.00" />
                        </div>
                      )}
                    </div>
                    <Toggle checked={formOtPay} onChange={setFormOtPay} label="Pay overtime premium" />
                  </>
                )}

                {formPayType === "salaried" && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-medium text-foreground">Monthly Salary (₹/month)</label>
                        <Input type="number" min="0" value={formSalary} onChange={(e) => setFormSalary(e.target.value)} placeholder="0.00" />
                      </div>
                      {formSalary && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[12px] text-muted-foreground">Daily allocation (visible to PM)</span>
                          <span className="text-sm font-medium text-foreground">
                            ₹{Math.round(Number(formSalary) / 26).toLocaleString()}/day
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {formPayType === "contract" && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-medium text-foreground">Contract Amount (₹)</label>
                        <Input type="number" min="0" value={formContractAmt} onChange={(e) => setFormContractAmt(e.target.value)} placeholder="0.00" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-medium text-foreground">Join Date</label>
                        <Input type="date" value={formJoinDate} onChange={(e) => setFormJoinDate(e.target.value)} />
                      </div>
                    </div>
                  </>
                )}

                {formPayType !== "contract" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-foreground">Join Date</label>
                    <Input type="date" value={formJoinDate} onChange={(e) => setFormJoinDate(e.target.value)} />
                  </div>
                )}

                {saveError && (
                  <p className="text-[12px] text-error-foreground">{saveError}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={backToList} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!formName.trim() || !formEmployeeId.trim() || !formEmail.trim() || isSaving}
                  >
                    {isSaving ? "Saving..." : selectedId ? "Update Person" : "Save Person"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
                <Users size={32} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Select a person to edit or click <strong>+</strong> to add one.
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Spotlight Search overlay */}
      <SpotlightSearch<PersonRecord>
        open={spotlightOpen}
        onClose={() => setSpotlightOpen(false)}
        placeholder="Search by name or employee ID..."
        items={[]}
        onSelect={handleSpotlightSelect}
        renderItem={renderSpotlightItem}
        onSearch={handleSpotlightSearch}
        searchDebounceMs={250}
        emptyLabel="Recently Added"
        noResultsLabel="No people found for"
      />
    </>
  );
}

/* ─────────────────────── Exports ─────────────────────────────────── */

export { PeopleModal, type PeopleModalProps };
