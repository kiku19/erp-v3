"use client";

import { useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/components/ui/tabs";
import { useOrgSetup } from "./context";
import { PeopleTab } from "./people-tab";
import { ResourcesTab } from "./resources-tab";
import { SettingsTab } from "./settings-tab";

function NodeModal() {
  const { state, dispatch, loadNodePeople, loadNodeEquipment, loadNodeMaterials } = useOrgSetup();
  const nodeId = state.ui.openNodeModalId;
  const node = nodeId ? state.nodes[nodeId] : null;
  const prevNodeIdRef = useRef<string | null>(null);

  const handleClose = useCallback(() => {
    dispatch({ type: "CLOSE_NODE_MODAL" });
  }, [dispatch]);

  const handleTabChange = useCallback(
    (tab: string) => {
      dispatch({ type: "SET_MODAL_TAB", tab: tab as "people" | "resources" | "settings" });
      if (!nodeId) return;
      if (tab === "people") loadNodePeople(nodeId);
      if (tab === "resources") {
        loadNodeEquipment(nodeId);
        loadNodeMaterials(nodeId);
      }
    },
    [dispatch, nodeId, loadNodePeople, loadNodeEquipment, loadNodeMaterials],
  );

  // Load people when modal opens (people is the default tab)
  useEffect(() => {
    if (nodeId && nodeId !== prevNodeIdRef.current) {
      loadNodePeople(nodeId);
      prevNodeIdRef.current = nodeId;
    }
    if (!nodeId) {
      prevNodeIdRef.current = null;
    }
  }, [nodeId, loadNodePeople]);

  useEffect(() => {
    if (!nodeId) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [nodeId, handleClose]);

  if (!node || !nodeId) return null;

  const modal = (
    <>
      {/* Backdrop */}
      <div
        data-testid="node-modal-backdrop"
        className="fixed inset-0 z-[299] bg-foreground/20"
        style={{ animation: "dropdown-in var(--duration-normal) var(--ease-default) forwards" }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        data-testid="node-modal"
        className={cn(
          "fixed left-1/2 top-1/2 z-[300] -translate-x-1/2 -translate-y-1/2",
          "flex w-[65vw] max-w-[1100px] h-[80vh] flex-col overflow-hidden",
          "rounded-lg border border-border bg-card shadow-[var(--shadow-modal)]",
        )}
        style={{ animation: "modal-enter 180ms var(--ease-default)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-foreground">{node.name}</span>
            <span className="font-mono text-[12px] text-muted-foreground">{node.code}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={state.ui.activeModalTab} onChange={handleTabChange} className="flex flex-1 flex-col min-h-0">
          <TabList>
            <Tab value="people">People</Tab>
            <Tab value="resources">Resources</Tab>
            <Tab value="settings">Settings</Tab>
          </TabList>

          <TabPanels className="flex flex-1 flex-col min-h-0 overflow-hidden">
            <TabPanel value="people" className="flex flex-1 flex-col min-h-0">
              <PeopleTab nodeId={nodeId} />
            </TabPanel>
            <TabPanel value="resources" className="flex-1 overflow-y-auto">
              <ResourcesTab nodeId={nodeId} />
            </TabPanel>
            <TabPanel value="settings" className="flex-1 overflow-y-auto">
              <SettingsTab nodeId={nodeId} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}

export { NodeModal };
