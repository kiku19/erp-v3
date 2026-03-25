"use client";

import { useCallback } from "react";
import { CalendarDays, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { useOrgSetup } from "./context";
import { type GlobalPanelType } from "./types";

function Header() {
  const { state, dispatch } = useOrgSetup();
  const { globalPanelOpen } = state.ui;

  const calendarCount = Object.keys(state.calendars).length;
  const roleCount = Object.keys(state.roles).length;

  const toggleModal = useCallback(
    (panel: GlobalPanelType) => {
      dispatch({
        type: "SET_GLOBAL_PANEL",
        panel: globalPanelOpen === panel ? null : panel,
      });
    },
    [dispatch, globalPanelOpen],
  );

  return (
    <header
      data-testid="org-setup-header"
      className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4"
    >
      {/* Left — Logo */}
      <div className="flex items-center gap-3">
        <Logo size="sm" iconOnly />
        <div className="h-4 w-px bg-border" />
        <span className="text-sm font-medium text-foreground">Organisation Setup</span>
      </div>

      {/* Center — global settings buttons */}
      <div className="flex items-center gap-2">
        <GlobalButton
          icon={<CalendarDays size={14} />}
          label="Calendars"
          count={calendarCount}
          isActive={globalPanelOpen === "calendars"}
          onClick={() => toggleModal("calendars")}
        />
        <GlobalButton
          icon={<Briefcase size={14} />}
          label="Roles"
          count={roleCount}
          isActive={globalPanelOpen === "roles"}
          onClick={() => toggleModal("roles")}
        />
      </div>

      {/* Right — spacer for balance */}
      <div className="w-[72px]" />
    </header>
  );
}

/* ─────────────────────── GlobalButton ───────────────────────────── */

interface GlobalButtonProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function GlobalButton({ icon, label, count, isActive, onClick }: GlobalButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        "gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium h-auto",
        isActive
          ? "border-foreground bg-foreground text-primary-foreground hover:bg-foreground/90"
          : "border-border bg-card text-muted-foreground hover:bg-muted-hover hover:text-foreground",
      )}
    >
      {icon}
      {label}
      {count > 0 && (
        <span
          className={cn(
            "ml-0.5 rounded-full px-1.5 text-[11px] font-semibold",
            isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </Button>
  );
}

export { Header };
