"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/* ─────────────────────── Types ───────────────────────────────────── */

interface AddNodeModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (epsId: string, name: string, parentNodeId?: string) => void;
  epsList: { id: string; name: string }[];
  selectedEpsId?: string;
}

/* ─────────────────────── Component ───────────────────────────────── */

function AddNodeModal({
  open,
  onClose,
  onSubmit,
  epsList,
  selectedEpsId,
}: AddNodeModalProps) {
  const [epsId, setEpsId] = useState(selectedEpsId ?? "");
  const [name, setName] = useState("");

  // Sync selectedEpsId when it changes
  useEffect(() => {
    if (selectedEpsId) {
      setEpsId(selectedEpsId);
    }
  }, [selectedEpsId]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!epsId || !trimmedName) return;
    onSubmit(epsId, trimmedName);
    setName("");
  };

  const handleClose = () => {
    setName("");
    onClose();
  };

  const epsOptions = epsList.map((eps) => ({
    value: eps.id,
    label: eps.name,
  }));

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalHeader
        title="Add Node"
        description="Create a new node under an EPS"
        onClose={handleClose}
      />
      <ModalBody>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Parent EPS
            </label>
            <Select
              options={epsOptions}
              value={epsId}
              onChange={setEpsId}
              placeholder="Select an EPS..."
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Node Name
            </label>
            <Input
              placeholder="Enter node name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!epsId || !name.trim()}>
          <Plus size={16} />
          Add Node
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export { AddNodeModal, type AddNodeModalProps };
