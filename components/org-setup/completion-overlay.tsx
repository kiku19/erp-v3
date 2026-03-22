"use client";

import { createPortal } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type OrgSetupState } from "./types";

interface CompletionOverlayProps {
  state: OrgSetupState;
  onContinue: () => void;
}

function CompletionOverlay({ state, onContinue }: CompletionOverlayProps) {
  const nodeCount = Object.values(state.nodes).filter((n) => n.type !== "COMPANY_ROOT").length;
  const peopleCount = Object.keys(state.people).length;
  const rolesAssigned = new Set(
    Object.values(state.nodes).flatMap((n) => n.assignedRoles.map((r) => r.roleId)),
  ).size;
  const calendarCount = Object.keys(state.calendars).length;

  const overlay = (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-foreground/30 backdrop-blur-sm"
      style={{ animation: "dropdown-in var(--duration-normal) var(--ease-default) forwards" }}
    >
      <div
        className="flex w-[400px] flex-col items-center gap-6 rounded-lg bg-card p-8 shadow-[var(--shadow-modal)]"
        style={{ animation: "modal-enter 180ms var(--ease-default)" }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg">
          <CheckCircle2 size={32} className="text-success" />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-xl font-semibold text-foreground">Organisation setup complete</h2>
          <p className="text-sm text-muted-foreground">{state.company.name} is ready.</p>
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          <Stat value={nodeCount} label="Divisions" />
          <Stat value={peopleCount} label="People added" />
          <Stat value={rolesAssigned} label="Roles assigned" />
          <Stat value={calendarCount} label="Calendars configured" />
        </div>

        <Button className="w-full" onClick={onContinue}>
          Go to OPUS Dashboard →
        </Button>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-md bg-muted p-3">
      <span className="text-lg font-semibold text-foreground">{value}</span>
      <span className="text-[12px] text-muted-foreground">{label}</span>
    </div>
  );
}

export { CompletionOverlay };
