"use client";

import { useState, useCallback, useMemo } from "react";
import { Search, Plus, UserMinus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";
import { SpotlightSearch } from "@/components/ui/spotlight-search";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { useOrgApi } from "@/hooks/use-org-api";
import { useOrgSetup } from "./context";
import { type Person, type PayType, type EmploymentType } from "./types";

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

interface PeopleTabProps {
  nodeId: string;
}

function PeopleTab({ nodeId }: PeopleTabProps) {
  const { state, loadNodePeople } = useOrgSetup();
  const { createPerson: apiCreatePerson, updatePerson: apiUpdatePerson, deletePerson: apiDeletePerson } = useOrgApi();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formNodeId, setFormNodeId] = useState(nodeId);
  const [formRoleId, setFormRoleId] = useState("");
  const [formPayType, setFormPayType] = useState<PayType>("hourly");
  const [formStdRate, setFormStdRate] = useState<string>("");
  const [formOtRate, setFormOtRate] = useState<string>("");
  const [formOtPay, setFormOtPay] = useState(true);
  const [formSalary, setFormSalary] = useState<string>("");
  const [formContractAmt, setFormContractAmt] = useState<string>("");
  const [formEmploymentType, setFormEmploymentType] = useState<EmploymentType>("full-time");
  const [formJoinDate, setFormJoinDate] = useState("");

  const node = state.nodes[nodeId];
  const isLoadingPeople = state.ui.nodeLoading[nodeId]?.people ?? false;
  const people = useMemo(
    () => Object.values(state.people).filter((p) => p.nodeId === nodeId),
    [state.people, nodeId],
  );

  const roleOptions = useMemo(
    () => Object.values(state.roles).map((r) => ({ value: r.id, label: `${r.name} (${r.code})` })),
    [state.roles],
  );

  const nodeOptions = useMemo(
    () => Object.values(state.nodes).map((n) => ({ value: n.id, label: n.name })),
    [state.nodes],
  );

  const selectedRole = formRoleId ? state.roles[formRoleId] : null;

  // Auto-show add form when no people exist
  const shouldShowFormByDefault = people.length === 0 && !showForm && !editingId;

  const resetForm = useCallback(() => {
    setFormName("");
    setFormEmployeeId("");
    setFormEmail("");
    setFormNodeId(nodeId);
    setFormRoleId("");
    setFormPayType("hourly");
    setFormStdRate("");
    setFormOtRate("");
    setFormOtPay(true);
    setFormSalary("");
    setFormContractAmt("");
    setFormEmploymentType("full-time");
    setFormJoinDate("");
    setEditingId(null);
    setShowForm(false);
  }, [nodeId]);

  const openNew = useCallback(() => {
    resetForm();
    setShowForm(true);
  }, [resetForm]);

  const openEdit = useCallback(
    (person: Person) => {
      setFormName(person.name);
      setFormEmployeeId(person.employeeId);
      setFormEmail(person.email);
      setFormNodeId(person.nodeId);
      setFormRoleId(person.roleId ?? "");
      setFormPayType(person.payType);
      setFormStdRate(person.standardRate?.toString() ?? "");
      setFormOtRate(person.overtimeRate?.toString() ?? "");
      setFormOtPay(person.overtimePay);
      setFormSalary(person.monthlySalary?.toString() ?? "");
      setFormContractAmt(person.contractAmount?.toString() ?? "");
      setFormEmploymentType(person.employmentType);
      setFormJoinDate(person.joinDate ?? "");
      setEditingId(person.id);
      setShowForm(true);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!formName.trim() || !formEmployeeId.trim() || !formEmail.trim()) return;

    const personData = {
      nodeId: formNodeId,
      name: formName.trim(),
      employeeId: formEmployeeId.trim(),
      email: formEmail.trim(),
      roleId: formRoleId || null,
      payType: formPayType,
      standardRate: formStdRate ? Number(formStdRate) : null,
      overtimeRate: formOtRate ? Number(formOtRate) : null,
      overtimePay: formOtPay,
      monthlySalary: formSalary ? Number(formSalary) : null,
      dailyAllocation: formSalary ? Math.round(Number(formSalary) / 26) : null,
      contractAmount: formContractAmt ? Number(formContractAmt) : null,
      employmentType: formEmploymentType,
      joinDate: formJoinDate || null,
      photoUrl: null,
    };

    setIsSaving(true);
    setSaveError(null);

    try {
      if (editingId) {
        await apiUpdatePerson(editingId, personData);
      } else {
        await apiCreatePerson(personData);
      }
      await loadNodePeople(nodeId);
      resetForm();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save person");
    } finally {
      setIsSaving(false);
    }
  }, [
    apiCreatePerson, apiUpdatePerson, loadNodePeople, nodeId,
    editingId, formName, formEmployeeId, formEmail, formNodeId,
    formRoleId, formPayType, formStdRate, formOtRate, formOtPay,
    formSalary, formContractAmt, formEmploymentType, formJoinDate, resetForm,
  ]);

  const handleRemove = useCallback(
    async (personId: string) => {
      setConfirmRemoveId(null);
      setSaveError(null);

      try {
        await apiDeletePerson(personId);
        await loadNodePeople(nodeId);
        if (editingId === personId) resetForm();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Failed to remove person");
      }
    },
    [apiDeletePerson, loadNodePeople, nodeId, editingId, resetForm],
  );

  // When pay type changes, lock employment type to "contract" if contract
  const handlePayTypeChange = useCallback(
    (payType: PayType) => {
      setFormPayType(payType);
      if (payType === "contract") {
        setFormEmploymentType("contract");
      }
    },
    [],
  );

  // When role changes, auto-fill pay type
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

  const handleSearchSelect = useCallback(
    (person: Person) => {
      openEdit(person);
      setShowSearch(false);
    },
    [openEdit],
  );

  const isFormVisible = showForm || editingId !== null || shouldShowFormByDefault;

  /* ─────────────────── Form Panel ─────────────────── */
  const formPanel = (
    <div className="flex flex-col gap-4 p-5 overflow-auto">
      <h3 className="text-sm font-semibold text-foreground">
        {editingId ? "Edit Person" : "Add Person"}
      </h3>

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
          <Select
            options={roleOptions}
            value={formRoleId}
            onChange={handleRoleChange}
            placeholder="Select a role"
          />
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
              <Input type="number" value={formStdRate} onChange={(e) => setFormStdRate(e.target.value)} placeholder="0.00" min={0.01} step={0.01} />
            </div>
            {selectedRole?.overtimeEligible !== false && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-foreground">Overtime Rate (₹/hr)</label>
                <Input type="number" value={formOtRate} onChange={(e) => setFormOtRate(e.target.value)} placeholder="0.00" />
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
              <Input type="number" value={formSalary} onChange={(e) => setFormSalary(e.target.value)} placeholder="0.00" />
            </div>
            {formSalary && (
              <div className="flex flex-col gap-1">
                <span className="text-[12px] text-muted-foreground">Daily allocation (visible to PM)</span>
                <span className="text-sm font-medium text-foreground">
                  ₹{Math.round(Number(formSalary) / 26).toLocaleString()}/day
                </span>
              </div>
            )}
            <p className="text-[12px] text-muted-foreground">No overtime pay for salaried employees</p>
          </div>
        </>
      )}

      {formPayType === "contract" && (
        <>
          <div className="h-px bg-border" />
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-1 min-w-[160px] flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Contract Amount (₹)</label>
              <Input type="number" value={formContractAmt} onChange={(e) => setFormContractAmt(e.target.value)} placeholder="0.00" />
            </div>
            <div className="flex flex-1 min-w-[160px] flex-col gap-1.5">
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
        {(showForm || editingId) && (
          <Button variant="outline" size="sm" onClick={resetForm} disabled={isSaving}>Cancel</Button>
        )}
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!formName.trim() || !formEmployeeId.trim() || !formEmail.trim() || isSaving}
        >
          {isSaving ? "Saving..." : editingId ? "Update Person" : "Save Person"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 min-h-0">
      {/* Left Panel — People List */}
      <div className="w-[360px] border-r border-border flex flex-col shrink-0">
        {/* List Header */}
        <div className="flex items-center justify-between h-12 px-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-foreground">People</span>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{people.length}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowSearch(true)}
              aria-label="Search people"
            >
              <Search size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={openNew}
              aria-label="Add person"
            >
              <Plus size={14} />
            </Button>
          </div>
        </div>

        {/* People List */}
        <div className="flex-1 min-h-0 overflow-auto">
          {isLoadingPeople ? (
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border animate-pulse">
                  <div className="h-7 w-7 rounded-full bg-muted" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="h-3 w-24 rounded bg-muted" />
                    <div className="h-2.5 w-32 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : people.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
              <Users size={24} className="text-muted-foreground" />
              <p className="text-[12px] text-muted-foreground">No people added</p>
            </div>
          ) : (
            people.map((person) => {
              const role = person.roleId ? state.roles[person.roleId] : null;
              const isConfirming = confirmRemoveId === person.id;
              const isEditing = editingId === person.id;

              return (
                <div
                  key={person.id}
                  className={cn(
                    "group/person flex items-center justify-between w-full px-4 py-2.5 border-b border-border last:border-0 cursor-pointer transition-colors duration-[var(--duration-fast)]",
                    isEditing
                      ? "bg-primary-active text-primary-active-foreground"
                      : "hover:bg-muted-hover",
                  )}
                >
                  <button
                    type="button"
                    className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                    onClick={() => openEdit(person)}
                  >
                    <div className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full shrink-0",
                      isEditing ? "bg-primary-active-foreground/15" : "bg-muted",
                    )}>
                      <span className={cn(
                        "text-[10px] font-semibold",
                        isEditing ? "text-primary-active-foreground" : "text-muted-foreground",
                      )}>
                        {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className={cn(
                        "text-[12px] font-medium truncate",
                        isEditing ? "text-primary-active-foreground" : "text-foreground",
                      )}>
                        {person.name}
                      </span>
                      <span className={cn(
                        "text-[10px] truncate",
                        isEditing ? "text-primary-active-foreground/70" : "text-muted-foreground",
                      )}>
                        {person.employeeId} · {role?.name ?? "No role"}
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {isConfirming ? (
                      <>
                        <Button variant="destructive" size="sm" className="h-6 text-[11px] px-2" onClick={() => handleRemove(person.id)}>
                          Remove
                        </Button>
                        <Button variant="outline" size="sm" className="h-6 text-[11px] px-2" onClick={() => setConfirmRemoveId(null)}>
                          No
                        </Button>
                      </>
                    ) : (
                      <Tooltip content="Unassign from this node" side="right">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setConfirmRemoveId(person.id); }}
                          className={cn(
                            "flex items-center justify-center h-6 w-6 rounded-md shrink-0 opacity-0 group-hover/person:opacity-100 transition-opacity duration-[var(--duration-fast)] cursor-pointer",
                            isEditing
                              ? "text-primary-active-foreground/70 hover:text-primary-active-foreground"
                              : "text-muted-foreground hover:text-destructive",
                          )}
                          aria-label={`Unassign ${person.name} from this node`}
                        >
                          <UserMinus size={13} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel — Form / Empty */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {isFormVisible ? (
          formPanel
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
            <Users size={32} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Select a person to edit or click <strong>+</strong> to add one.
            </p>
          </div>
        )}
      </div>

      {/* Spotlight search */}
      <SpotlightSearch<Person>
        open={showSearch}
        onClose={() => setShowSearch(false)}
        placeholder="Search people..."
        items={people}
        onSelect={handleSearchSelect}
        filterFn={(person, q) => {
          const lower = q.toLowerCase();
          return person.name.toLowerCase().includes(lower) || person.employeeId.toLowerCase().includes(lower);
        }}
        renderItem={(person, isActive) => {
          const role = person.roleId ? state.roles[person.roleId] : null;
          return (
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full shrink-0",
                isActive ? "bg-primary-active-foreground/15" : "bg-muted",
              )}>
                <span className={cn(
                  "text-[10px] font-semibold",
                  isActive ? "text-primary-active-foreground" : "text-muted-foreground",
                )}>
                  {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{person.name}</span>
                <span className={cn("text-[11px]", isActive ? "text-primary-active-foreground/70" : "text-muted-foreground")}>
                  {person.employeeId} · {role?.name ?? "No role"}
                </span>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

export { PeopleTab };
