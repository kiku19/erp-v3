"use client";

import { useState, useCallback } from "react";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { OrgSetupProvider, useOrgSetup } from "./context";
import { useOrgAutosave } from "./use-org-autosave";
import { Header } from "./header";
import { Canvas } from "./canvas";
import { AddNodeModal } from "./add-node-modal";
import { NodeModal } from "./node-modal";
import { CalendarsModal } from "./calendars-modal";
import { RolesModal } from "./roles-modal";
import { CostCentresModal } from "./cost-centres-modal";
import { CompletionOverlay } from "./completion-overlay";
import { validateOrgSetup } from "./validation";

/* ─────────────────────── Inner Screen ──────────────────────────── */

interface OrgSetupScreenInnerProps {
  onComplete: () => void;
}

function OrgSetupScreenInner({ onComplete }: OrgSetupScreenInnerProps) {
  const { state, dispatch } = useOrgSetup();
  const { toast } = useToast();
  const [showCompletion, setShowCompletion] = useState(false);

  // Auto-save to localStorage on every data change
  const { saveStatus, lastSavedAt } = useOrgAutosave(state);

  const handleSaveAndContinue = useCallback(() => {
    const error = validateOrgSetup(state);
    if (error) {
      toast({
        variant: "error",
        title: "Cannot continue",
        message: error.message,
        duration: 5000,
      });
      return;
    }

    try {
      localStorage.setItem("opus_setup_complete", "true");
      localStorage.removeItem("opus_setup_draft");
    } catch {
      // ignore
    }

    setShowCompletion(true);
  }, [state, toast]);

  const handleContinueToDashboard = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const closeGlobalModal = useCallback(() => {
    dispatch({ type: "SET_GLOBAL_PANEL", panel: null });
  }, [dispatch]);

  return (
    <div className="flex h-screen flex-col" data-testid="org-setup-screen">
      <Header
        onSaveAndContinue={handleSaveAndContinue}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
      />
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
      <CostCentresModal
        open={state.ui.globalPanelOpen === "costcentres"}
        onClose={closeGlobalModal}
      />
      {showCompletion && (
        <CompletionOverlay state={state} onContinue={handleContinueToDashboard} />
      )}
    </div>
  );
}

/* ─────────────────────── Wrapper with Provider ─────────────────── */

interface OrgSetupScreenProps {
  companyName: string;
  onComplete: () => void;
}

function OrgSetupScreen({ companyName, onComplete }: OrgSetupScreenProps) {
  return (
    <ToastProvider>
      <OrgSetupProvider companyName={companyName}>
        <OrgSetupScreenInner onComplete={onComplete} />
      </OrgSetupProvider>
    </ToastProvider>
  );
}

export { OrgSetupScreen, type OrgSetupScreenProps };
