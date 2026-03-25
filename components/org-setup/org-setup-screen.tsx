"use client";

import { useCallback } from "react";
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
