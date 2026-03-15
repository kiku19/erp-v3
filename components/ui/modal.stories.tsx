import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "./modal";
import { Button } from "./button";
import { Input } from "./input";

const meta: Meta<typeof Modal> = {
  title: "UI/Modal",
  component: Modal,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Modal</Button>
        <Modal open={open} onClose={() => setOpen(false)}>
          <ModalHeader
            title="Create EPS"
            description="Create a new Enterprise Project Structure"
            onClose={() => setOpen(false)}
          />
          <ModalBody>
            <div className="flex flex-col gap-4">
              <label className="text-[13px] font-medium text-foreground">
                EPS Name
                <Input placeholder="Enter EPS name..." className="mt-1.5" />
              </label>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Create EPS</Button>
          </ModalFooter>
        </Modal>
      </>
    );
  },
};

export const WideModal: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Wide Modal</Button>
        <Modal open={open} onClose={() => setOpen(false)} width={560}>
          <ModalHeader
            title="Search"
            description="Search EPS, projects, or nodes"
            onClose={() => setOpen(false)}
          />
          <ModalBody>
            <Input placeholder="Search EPS, projects, or nodes..." />
          </ModalBody>
        </Modal>
      </>
    );
  },
};

export const WithMultipleFields: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Add Project</Button>
        <Modal open={open} onClose={() => setOpen(false)} width={480}>
          <ModalHeader
            title="Add Project"
            description="Create a new project under an EPS node"
            onClose={() => setOpen(false)}
          />
          <ModalBody>
            <div className="flex flex-col gap-4">
              <label className="text-[13px] font-medium text-foreground">
                Project Name
                <Input placeholder="Enter project name..." className="mt-1.5" />
              </label>
              <label className="text-[13px] font-medium text-foreground">
                Responsible Manager
                <Input placeholder="Enter manager name..." className="mt-1.5" />
              </label>
              <div className="flex gap-4">
                <label className="flex-1 text-[13px] font-medium text-foreground">
                  Start Date
                  <Input placeholder="DD/MM/YYYY" className="mt-1.5" />
                </label>
                <label className="flex-1 text-[13px] font-medium text-foreground">
                  End Date
                  <Input placeholder="DD/MM/YYYY" className="mt-1.5" />
                </label>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Add Project</Button>
          </ModalFooter>
        </Modal>
      </>
    );
  },
};

export const OpenByDefault: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalHeader
          title="Confirmation"
          onClose={() => setOpen(false)}
        />
        <ModalBody>
          <p className="text-[13px] text-foreground">
            Are you sure you want to proceed?
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>Confirm</Button>
        </ModalFooter>
      </Modal>
    );
  },
};
