"use client";

import { useState, useEffect } from "react";
import { FolderPlus } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { type CreateProjectData } from "./use-eps-data";

/* ─────────────────────── Types ───────────────────────────────────── */

interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (epsId: string, data: CreateProjectData) => void;
  epsList: { id: string; name: string }[];
  selectedEpsId?: string;
}

/* ─────────────────────── Component ───────────────────────────────── */

function AddProjectModal({
  open,
  onClose,
  onSubmit,
  epsList,
  selectedEpsId,
}: AddProjectModalProps) {
  const [epsId, setEpsId] = useState(selectedEpsId ?? "");
  const [name, setName] = useState("");
  const [manager, setManager] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sync selectedEpsId when it changes
  useEffect(() => {
    if (selectedEpsId) {
      setEpsId(selectedEpsId);
    }
  }, [selectedEpsId]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!epsId || !trimmedName) return;
    onSubmit(epsId, {
      name: trimmedName,
      responsibleManager: manager.trim() || undefined,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    });
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setManager("");
    setStartDate("");
    setEndDate("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const epsOptions = epsList.map((eps) => ({
    value: eps.id,
    label: eps.name,
  }));

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalHeader
        title="Add Project"
        description="Create a new project under an EPS node"
        onClose={handleClose}
      />
      <ModalBody>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              EPS Name
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
              Project Name
            </label>
            <Input
              placeholder="Enter project name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Responsible Manager
            </label>
            <Input
              placeholder="Enter manager name..."
              value={manager}
              onChange={(e) => setManager(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!epsId || !name.trim()}>
          <FolderPlus size={16} />
          Add Project
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export { AddProjectModal, type AddProjectModalProps };
