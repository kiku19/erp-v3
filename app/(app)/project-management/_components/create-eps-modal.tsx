"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ─────────────────────── Types ───────────────────────────────────── */

interface CreateEpsModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

/* ─────────────────────── Component ───────────────────────────────── */

function CreateEpsModal({ open, onClose, onSubmit }: CreateEpsModalProps) {
  const [name, setName] = useState("");

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setName("");
  };

  const handleClose = () => {
    setName("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalHeader
        title="Create EPS"
        description="Create a new Enterprise Project Structure"
        onClose={handleClose}
      />
      <ModalBody>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            EPS Name
          </label>
          <Input
            placeholder="Enter EPS name..."
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
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!name.trim()}>
          <Building2 size={16} />
          Create EPS
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export { CreateEpsModal, type CreateEpsModalProps };
