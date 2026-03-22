"use client";

import { useState, useCallback, useMemo } from "react";
import { Search, Plus, Pencil, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { useOrgSetup, generateId } from "./context";
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
  const { state, dispatch } = useOrgSetup();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

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
  const people = useMemo(
    () => Object.values(state.people).filter((p) => p.nodeId === nodeId),
    [state.people, nodeId],
  );

  const filteredPeople = useMemo(
    () =>
      search
        ? people.filter(
            (p) =>
              p.name.toLowerCase().includes(search.toLowerCase()) ||
              p.employeeId.toLowerCase().includes(search.toLowerCase()),
          )
        : people,
    [people, search],
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

  const handleSave = useCallback(() => {
    if (!formName.trim() || !formEmployeeId.trim() || !formEmail.trim()) return;

    const person: Person = {
      id: editingId ?? generateId("person"),
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

    if (editingId) {
      dispatch({ type: "UPDATE_PERSON", personId: editingId, updates: person });
    } else {
      dispatch({ type: "ADD_PERSON", person });
    }
    resetForm();
  }, [
    dispatch, editingId, formName, formEmployeeId, formEmail, formNodeId,
    formRoleId, formPayType, formStdRate, formOtRate, formOtPay,
    formSalary, formContractAmt, formEmploymentType, formJoinDate, resetForm,
  ]);

  const handleRemove = useCallback(
    (personId: string) => {
      dispatch({ type: "REMOVE_PERSON", personId });
      setConfirmRemoveId(null);
    },
    [dispatch],
  );

  // When role changes, auto-fill pay type
  const handleRoleChange = useCallback(
    (roleId: string) => {
      setFormRoleId(roleId);
      const role = state.roles[roleId];
      if (role) {
        setFormPayType(role.defaultPayType);
        setFormOtPay(role.overtimeEligible);
      }
    },
    [state.roles],
  );

  if (showForm) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <h3 className="text-sm font-semibold text-foreground">
          {editingId ? "Edit Person" : "Add Person"}
        </h3>

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

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">OBS Node</label>
            <Select options={nodeOptions} value={formNodeId} onChange={setFormNodeId} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Role *</label>
            <Select
              options={roleOptions}
              value={formRoleId}
              onChange={handleRoleChange}
              placeholder="Select a role"
            />
            {roleOptions.length === 0 && (
              <p className="text-[11px] text-warning-foreground">Create roles first in the Roles panel</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Pay Type *</label>
            <Select options={PAY_TYPE_OPTIONS} value={formPayType} onChange={(v) => setFormPayType(v as PayType)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Employment Type *</label>
            <Select options={EMPLOYMENT_TYPE_OPTIONS} value={formEmploymentType} onChange={(v) => setFormEmploymentType(v as EmploymentType)} />
          </div>
        </div>

        {/* Conditional pay fields */}
        <div className="h-px bg-border" />

        {formPayType === "hourly" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Standard Rate (₹/hr) *</label>
              <Input type="number" value={formStdRate} onChange={(e) => setFormStdRate(e.target.value)} placeholder="0.00" min={0.01} step={0.01} />
            </div>
            {selectedRole?.overtimeEligible !== false && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-foreground">Overtime Rate (₹/hr)</label>
                <Input type="number" value={formOtRate} onChange={(e) => setFormOtRate(e.target.value)} placeholder="0.00" />
              </div>
            )}
            <Toggle checked={formOtPay} onChange={setFormOtPay} label="Pay overtime premium" />
          </div>
        )}

        {formPayType === "salaried" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Monthly Salary (₹/month) *</label>
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
        )}

        {formPayType === "contract" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Contract Amount (₹) *</label>
              <Input type="number" value={formContractAmt} onChange={(e) => setFormContractAmt(e.target.value)} placeholder="0.00" />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-foreground">Join Date</label>
          <Input type="date" value={formJoinDate} onChange={(e) => setFormJoinDate(e.target.value)} />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!formName.trim() || !formEmployeeId.trim() || !formEmail.trim()}
          >
            {editingId ? "Update Person" : "Save Person"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Search + Add */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people..."
            className="pl-8"
          />
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus size={14} /> Add Person
        </Button>
      </div>

      {/* List */}
      {filteredPeople.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Users size={32} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {search ? "No people match your search." : `No people in ${node?.name ?? "this node"} yet.`}
          </p>
          {!search && (
            <Button size="sm" variant="outline" onClick={openNew}>
              <Plus size={14} /> Add Person
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {filteredPeople.map((person) => {
            const role = person.roleId ? state.roles[person.roleId] : null;
            const isConfirming = confirmRemoveId === person.id;

            return (
              <div
                key={person.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{person.name}</span>
                    <span className="text-[12px] text-muted-foreground">
                      {person.employeeId} · {role?.name ?? "No role"} · {person.payType}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isConfirming ? (
                    <>
                      <span className="mr-2 text-[12px] text-muted-foreground">Remove?</span>
                      <Button variant="destructive" size="sm" className="h-7" onClick={() => handleRemove(person.id)}>
                        Remove
                      </Button>
                      <Button variant="outline" size="sm" className="h-7" onClick={() => setConfirmRemoveId(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(person)}>
                        <Pencil size={13} />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setConfirmRemoveId(person.id)}>
                        <X size={13} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { PeopleTab };
