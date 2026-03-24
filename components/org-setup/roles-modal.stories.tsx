import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { RolesModal, RolesSearchModal, DeleteRoleModal } from "./roles-modal";
import { OrgSetupProvider } from "./context";

/* ─────────────────────── RolesModal Stories ──────────────────────── */

const meta: Meta<typeof RolesModal> = {
  title: "OrgSetup/RolesModal",
  component: RolesModal,
  decorators: [
    (Story) => (
      <OrgSetupProvider companyName="Acme Construction">
        <Story />
      </OrgSetupProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RolesModal>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return <RolesModal open={open} onClose={() => setOpen(false)} />;
  },
};

export const Closed: Story = {
  args: {
    open: false,
    onClose: () => {},
  },
};

/* ─────────────────────── Search Modal Stories ────────────────────── */

const searchMeta: Meta<typeof RolesSearchModal> = {
  title: "OrgSetup/RolesSearchModal",
  component: RolesSearchModal,
};

export const SearchWithResults: StoryObj<typeof RolesSearchModal> = {
  render: () => {
    const [query, setQuery] = useState("eng");
    const roles = [
      { id: "r1", name: "Site Engineer", code: "ENGR-ST", level: "Senior" as const, defaultPayType: "hourly" as const, overtimeEligible: true, skillTags: [] },
      { id: "r2", name: "Civil Engineer", code: "ENGR-CV", level: "Mid" as const, defaultPayType: "salaried" as const, overtimeEligible: false, skillTags: [] },
    ];
    return (
      <RolesSearchModal
        open={true}
        onClose={() => {}}
        query={query}
        onQueryChange={setQuery}
        roles={roles}
        onSelect={() => {}}
      />
    );
  },
};

export const SearchEmpty: StoryObj<typeof RolesSearchModal> = {
  render: () => (
    <RolesSearchModal
      open={true}
      onClose={() => {}}
      query="xyz"
      onQueryChange={() => {}}
      roles={[]}
      onSelect={() => {}}
    />
  ),
};

/* ─────────────────────── Delete Modal Stories ────────────────────── */

export const DeleteConfirmation: StoryObj<typeof DeleteRoleModal> = {
  render: () => (
    <DeleteRoleModal
      open={true}
      roleName="Senior Painter"
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  ),
};
