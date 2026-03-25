"use client";

import { useCallback } from "react";
import { Loader2 } from "lucide-react";
import { ToastProvider } from "@/components/ui/toast";
import { OrgSetupProvider, useOrgSetup } from "./context";
import { Header } from "./header";
import { Canvas } from "./canvas";
import { AddNodeModal } from "./add-node-modal";
import { NodeModal } from "./node-modal";
import { CalendarsModal } from "./calendars-modal";
import { RolesModal } from "./roles-modal";

/* ─────────────────────── Inner Screen ──────────────────────────── */

function OrgSetupScreenInner() {
  const { state, dispatch } = useOrgSetup();

  const closeGlobalModal = useCallback(() => {
    dispatch({ type: "SET_GLOBAL_PANEL", panel: null });
  }, [dispatch]);

  if (state.ui.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background" data-testid="org-setup-loading">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading organisation setup…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col" data-testid="org-setup-screen">
      <Header />
      <Canvas />
      <AddNodeModal />
      <NodeModal />
      <CalendarsModal
        open={state.ui.globalPanelOpen === "calendars"}
        onClose={closeGlobalModal}
      />
      <RolesModal
        open={state.ui.globalPanelOpen === "roles"}
        onClose={closeGlobalModal}
      />
    </div>
  );
}

/* ─────────────────────── Wrapper with Provider ─────────────────── */

interface OrgSetupScreenProps {
  companyName: string;
}

function OrgSetupScreen({ companyName }: OrgSetupScreenProps) {
  return (
    <ToastProvider>
      <OrgSetupProvider companyName={companyName}>
        <OrgSetupScreenInner />
      </OrgSetupProvider>
    </ToastProvider>
  );
}

export { OrgSetupScreen, type OrgSetupScreenProps };
