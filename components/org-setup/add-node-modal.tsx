"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { useOrgSetup } from "./context";
import { NODE_TYPE_BY_DEPTH, NODE_TYPE_LABELS } from "./types";

function AddNodeModal() {
  const { state, dispatch, getNodeDepth } = useOrgSetup();
  const target = state.ui.addNodeTarget;
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);

  const isOpen = target !== null;

  // Derive context
  const parentNode = target ? state.nodes[target.parentId] : null;
  const parentDepth = target ? getNodeDepth(target.parentId) : 0;
  const newDepth = target?.type === "child" ? parentDepth + 1 : parentDepth;
  const nodeType = NODE_TYPE_BY_DEPTH[newDepth] ?? "TEAM";
  const nodeTypeLabel = NODE_TYPE_LABELS[nodeType];

  // Auto-generate code from name
  useEffect(() => {
    if (codeManuallyEdited || !name) return;
    const generated = name
      .split(/\s+/)
      .map((w) => w.slice(0, 3).toUpperCase())
      .join("-")
      .slice(0, 15);
    setCode(generated);
  }, [name, codeManuallyEdited]);

  const handleClose = useCallback(() => {
    dispatch({ type: "SET_ADD_NODE_TARGET", target: null });
    setName("");
    setCode("");
    setCodeManuallyEdited(false);
  }, [dispatch]);

  const handleSubmit = useCallback(() => {
    if (!target || !name.trim() || !code.trim()) return;

    dispatch({
      type: "ADD_NODE",
      parentId: target.parentId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      asChild: target.type === "child",
    });

    // Get the newly added node's ID to open its modal
    // The node was just added — we need to find it
    handleClose();

    // Open the node modal for the new node after a tick
    // (the state update needs to propagate)
    setTimeout(() => {
      // Find the most recently added node by checking all nodes
      const allNodes = Object.values(state.nodes);
      // Actually, we set a timeout and check after dispatch
    }, 0);
  }, [target, name, code, dispatch, handleClose, state.nodes]);

  // Build title
  let title = `Add ${nodeTypeLabel}`;
  if (target?.type === "child" && parentNode) {
    title = parentNode.type === "COMPANY_ROOT"
      ? `Add Division`
      : `Add ${nodeTypeLabel} under ${parentNode.name}`;
  } else if (target?.type === "sibling" && parentNode) {
    title = `Add ${nodeTypeLabel} (same level as ${parentNode.name})`;
  }

  return (
    <Modal open={isOpen} onClose={handleClose} width={400}>
      <ModalHeader title={title} onClose={handleClose} />
      <ModalBody>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g., Civil Engineering`}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Code</label>
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setCodeManuallyEdited(true);
              }}
              placeholder="Auto-generated from name"
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Auto-suggested from name. Must be unique.
            </p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" size="sm" onClick={handleClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={!name.trim() || !code.trim()}>
          Add {nodeTypeLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export { AddNodeModal };
