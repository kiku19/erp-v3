"use client";

import { useState, useCallback } from "react";
import { Save } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface SaveLayoutModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  accessToken: string | null;
}

function SaveLayoutModal({ open, onClose, projectId, accessToken }: SaveLayoutModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!name.trim() || !accessToken) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/planner/layouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ projectId, name: name.trim(), description: description.trim() }),
      });

      if (!res.ok) {
        setError("Failed to save layout. Please try again.");
        return;
      }

      setName("");
      setDescription("");
      onClose();
    } catch {
      setError("Failed to save layout. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [name, description, projectId, accessToken, onClose]);

  return (
    <Modal open={open} onClose={onClose} width={460}>
      <ModalHeader
        title="Save as Layout"
        description="Save this project's structure as a reusable template"
        onClose={onClose}
      />
      <ModalBody>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="layout-name" className="text-[13px] font-medium text-foreground">
              Layout Name
            </label>
            <Input
              id="layout-name"
              placeholder="e.g. Metro Rail Template"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="layout-desc" className="text-[13px] font-medium text-foreground">
              Description
            </label>
            <Textarea
              id="layout-desc"
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          {error && (
            <p className="text-[13px] text-destructive">{error}</p>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={!name.trim() || saving}
        >
          <Save size={14} />
          {saving ? "Saving..." : "Save Layout"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export { SaveLayoutModal };
