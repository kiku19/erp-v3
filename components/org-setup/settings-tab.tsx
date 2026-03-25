"use client";

import { useState, useCallback, useMemo } from "react";
import { ChevronDown, ChevronRight, Plus, Pencil, X, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useOrgSetup, generateId } from "./context";
import { type AssignedRole } from "./types";

interface SettingsTabProps {
  nodeId: string;
}

function SettingsTab({ nodeId }: SettingsTabProps) {
  const [openSection, setOpenSection] = useState<string>("node-head");

  const toggle = (section: string) =>
    setOpenSection((prev) => (prev === section ? "" : section));

  return (
    <div className="flex flex-col">
      <AccordionSection title="Node Head" id="node-head" isOpen={openSection === "node-head"} onToggle={() => toggle("node-head")}>
        <NodeHeadSection nodeId={nodeId} />
      </AccordionSection>

      <AccordionSection title="Calendar" id="calendar" isOpen={openSection === "calendar"} onToggle={() => toggle("calendar")}>
        <CalendarSection nodeId={nodeId} />
      </AccordionSection>

      <AccordionSection title="Roles & Rates" id="roles" isOpen={openSection === "roles"} onToggle={() => toggle("roles")}>
        <RolesRatesSection nodeId={nodeId} />
      </AccordionSection>
    </div>
  );
}

/* ─────────────────────── Accordion ─────────────────────────────── */

function AccordionSection({
  title, id, isOpen, onToggle, children,
}: {
  title: string;
  id: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border">
      <Button
        variant="ghost"
        onClick={onToggle}
        aria-expanded={isOpen}
        data-testid={`accordion-${id}`}
        className="flex w-full justify-start gap-2 px-4 py-3 text-sm font-medium h-auto rounded-none"
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
      </Button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/* ─────────────────────── Node Head ──────────────────────────────── */

function NodeHeadSection({ nodeId }: { nodeId: string }) {
  const { state, dispatch } = useOrgSetup();
  const node = state.nodes[nodeId];
  const nodePeople = useMemo(
    () => Object.values(state.people).filter((p) => p.nodeId === nodeId),
    [state.people, nodeId],
  );

  const selectedPerson = node?.nodeHeadPersonId ? state.people[node.nodeHeadPersonId] : null;

  const personOptions = useMemo(
    () => nodePeople.map((p) => ({ value: p.id, label: `${p.name} (${p.employeeId})` })),
    [nodePeople],
  );

  const handleChange = useCallback(
    (personId: string) => {
      dispatch({ type: "UPDATE_NODE", nodeId, updates: { nodeHeadPersonId: personId } });
    },
    [dispatch, nodeId],
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted-foreground">
        Who leads this division and receives escalations.
      </p>
      {nodePeople.length === 0 ? (
        <div className="rounded-md bg-muted p-3 text-[13px] text-muted-foreground">
          Add people in the People tab first, then assign a node head here.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-foreground">Node Head</label>
          <Select
            options={personOptions}
            value={node?.nodeHeadPersonId ?? ""}
            onChange={handleChange}
            placeholder="Select person"
          />
          {selectedPerson && (
            <div className="mt-1 flex items-center gap-2 rounded-md bg-muted p-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {selectedPerson.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <span className="text-[13px] text-foreground">{selectedPerson.name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Calendar ───────────────────────────────── */

function CalendarSection({ nodeId }: { nodeId: string }) {
  const { state, dispatch } = useOrgSetup();
  const node = state.nodes[nodeId];
  const calendars = Object.values(state.calendars);

  const calendarOptions = useMemo(
    () => calendars.map((c) => ({ value: c.id, label: c.name })),
    [calendars],
  );

  const selectedCalendar = node?.calendarId ? state.calendars[node.calendarId] : null;


  const handleChange = useCallback(
    (calId: string) => {
      dispatch({ type: "UPDATE_NODE", nodeId, updates: { calendarId: calId } });
    },
    [dispatch, nodeId],
  );

  return (
    <div className="flex flex-col gap-3">
      {calendars.length === 0 ? (
        <div className="flex flex-col gap-2 rounded-md bg-muted p-3">
          <p className="text-[13px] text-muted-foreground">No calendars created yet.</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={() => dispatch({ type: "SET_GLOBAL_PANEL", panel: "calendars" })}
          >
            Create a Calendar <ExternalLink size={12} />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Assign Calendar</label>
            <Select
              options={calendarOptions}
              value={node?.calendarId ?? ""}
              onChange={handleChange}
              placeholder="Select calendar"
            />
          </div>
          {selectedCalendar && (
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-medium text-foreground">{selectedCalendar.name}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Working days: {selectedCalendar.workDays.filter((d) => d.working).map((d) => d.day.slice(0, 3)).join(", ")}
              </p>
              <p className="text-[12px] text-muted-foreground">
                Hours per day: {selectedCalendar.hoursPerDay}
              </p>
              {selectedCalendar.exceptions.length > 0 && (
                <p className="text-[12px] text-muted-foreground">
                  Exceptions: {selectedCalendar.exceptions.length} dates
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─────────────────────── Roles & Rates ──────────────────────────── */

function RolesRatesSection({ nodeId }: { nodeId: string }) {
  const { state, dispatch } = useOrgSetup();
  const node = state.nodes[nodeId];
  const allRoles = Object.values(state.roles);
  const [assigning, setAssigning] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [rateStd, setRateStd] = useState("");
  const [rateOt, setRateOt] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editStd, setEditStd] = useState("");
  const [editOt, setEditOt] = useState("");
  const [confirmRemoveRoleId, setConfirmRemoveRoleId] = useState<string | null>(null);

  const assignedRoleIds = new Set(node?.assignedRoles.map((r) => r.roleId));

  const availableRoles = useMemo(
    () =>
      allRoles.map((r) => ({
        value: r.id,
        label: assignedRoleIds.has(r.id) ? `${r.name} (already assigned)` : r.name,
        disabled: assignedRoleIds.has(r.id),
      })),
    [allRoles, assignedRoleIds],
  );

  const handleAssign = useCallback(() => {
    if (!selectedRoleId || !rateStd) return;
    dispatch({
      type: "ASSIGN_ROLE_TO_NODE",
      nodeId,
      assignedRole: {
        roleId: selectedRoleId,
        standardRate: Number(rateStd),
        overtimeRate: rateOt ? Number(rateOt) : null,
      },
    });
    setAssigning(false);
    setSelectedRoleId("");
    setRateStd("");
    setRateOt("");
  }, [dispatch, nodeId, selectedRoleId, rateStd, rateOt]);

  const openEditRate = useCallback(
    (roleId: string) => {
      const ar = node?.assignedRoles.find((r) => r.roleId === roleId);
      if (ar) {
        setEditingRoleId(roleId);
        setEditStd(ar.standardRate?.toString() ?? "");
        setEditOt(ar.overtimeRate?.toString() ?? "");
      }
    },
    [node],
  );

  const handleSaveRate = useCallback(() => {
    if (!editingRoleId) return;
    dispatch({
      type: "UPDATE_NODE_ROLE_RATE",
      nodeId,
      roleId: editingRoleId,
      standardRate: editStd ? Number(editStd) : null,
      overtimeRate: editOt ? Number(editOt) : null,
    });
    setEditingRoleId(null);
  }, [dispatch, nodeId, editingRoleId, editStd, editOt]);

  const handleRemoveRole = useCallback(
    (roleId: string) => {
      dispatch({ type: "REMOVE_ROLE_FROM_NODE", nodeId, roleId });
      setConfirmRemoveRoleId(null);
    },
    [dispatch, nodeId],
  );

  const selectedRoleForAssign = selectedRoleId ? state.roles[selectedRoleId] : null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted-foreground">
        Roles active in this division and their cost rates.
      </p>
      <div className="flex items-center gap-2 rounded-md bg-info-bg p-2">
        <Info size={12} className="shrink-0 text-info" />
        <p className="text-[11px] text-info-foreground">
          Rates are specific to this division. The same role can cost differently in other divisions.
        </p>
      </div>

      {/* Assigned roles list */}
      {(node?.assignedRoles ?? []).length === 0 && !assigning ? (
        <div className="flex flex-col gap-2 py-2">
          <p className="text-[13px] text-muted-foreground">No roles assigned to this division.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {(node?.assignedRoles ?? []).map((ar) => {
            const role = state.roles[ar.roleId];
            if (!role) return null;
            const isEditing = editingRoleId === ar.roleId;
            const isConfirming = confirmRemoveRoleId === ar.roleId;

            return (
              <div key={ar.roleId} className="flex flex-col rounded-md border border-border p-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {role.name} <span className="font-mono text-[11px] text-muted-foreground">{role.code}</span>
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      ₹{ar.standardRate ?? "—"}/hr std
                      {ar.overtimeRate ? ` · ₹${ar.overtimeRate}/hr OT` : ""}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {isConfirming ? (
                      <>
                        <Button variant="destructive" size="sm" className="h-7" onClick={() => handleRemoveRole(ar.roleId)}>Remove</Button>
                        <Button variant="outline" size="sm" className="h-7" onClick={() => setConfirmRemoveRoleId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => openEditRate(ar.roleId)}>
                          <Pencil size={12} /> Edit Rate
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setConfirmRemoveRoleId(ar.roleId)}>
                          <X size={13} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {isEditing && (
                  <div className="mt-2 flex items-end gap-2 border-t border-border pt-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-muted-foreground">Std Rate</label>
                      <Input type="number" value={editStd} onChange={(e) => setEditStd(e.target.value)} className="h-8 w-28" />
                    </div>
                    {role.overtimeEligible && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-muted-foreground">OT Rate</label>
                        <Input type="number" value={editOt} onChange={(e) => setEditOt(e.target.value)} className="h-8 w-28" />
                      </div>
                    )}
                    <Button size="sm" className="h-8" onClick={handleSaveRate}>Save</Button>
                    <Button variant="outline" size="sm" className="h-8" onClick={() => setEditingRoleId(null)}>Cancel</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assign new role */}
      {assigning ? (
        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Select Role</label>
            <Select
              options={availableRoles.filter((r) => !assignedRoleIds.has(r.value))}
              value={selectedRoleId}
              onChange={setSelectedRoleId}
              placeholder="Select role"
            />
          </div>
          {selectedRoleForAssign && (
            <div className="flex gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-foreground">Standard Rate *</label>
                <Input type="number" value={rateStd} onChange={(e) => setRateStd(e.target.value)} placeholder="0.00" />
              </div>
              {selectedRoleForAssign.overtimeEligible && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-foreground">Overtime Rate</label>
                  <Input type="number" value={rateOt} onChange={(e) => setRateOt(e.target.value)} placeholder="0.00" />
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setAssigning(false); setSelectedRoleId(""); }}>Cancel</Button>
            <Button size="sm" onClick={handleAssign} disabled={!selectedRoleId || !rateStd}>Assign Role</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setAssigning(true)}>
          <Plus size={14} /> Assign Role from Catalogue
        </Button>
      )}
    </div>
  );
}

export { SettingsTab };
