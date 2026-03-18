"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";

/* ─── Types ────────────────────────────────── */

interface FillModalProps {
  open: boolean;
  onClose: () => void;
  cellCount: number;
  onApply: (value: string) => void;
}

/* ─── Component ────────────────────────────── */

function FillModal({ open, onClose, cellCount, onApply }: FillModalProps) {
  const [value, setValue] = useState("");

  const handleApply = () => {
    onApply(value);
    setValue("");
  };

  const handleClose = () => {
    setValue("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalHeader title="Fill Cells" description={`Fill ${cellCount} cells with a value`} onClose={handleClose} />
      <ModalBody>
        <label htmlFor="fill-value" className="block text-sm font-medium text-foreground mb-2">
          Fill value
        </label>
        <Input
          id="fill-value"
          aria-label="Fill value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter value to fill..."
          autoFocus
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleApply}>
          Apply
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export { FillModal, type FillModalProps };
