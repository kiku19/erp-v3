import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "./tabs";

const meta: Meta<typeof Tabs> = {
  title: "UI/Tabs",
  component: Tabs,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="general">
      <TabList>
        <Tab value="general">General</Tab>
        <Tab value="budget">Budget & Cost</Tab>
        <Tab value="schedule">Schedule</Tab>
        <Tab value="resources">Resources</Tab>
        <Tab value="documents">Documents</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="general" className="p-4">
          <p className="text-foreground">General information goes here.</p>
        </TabPanel>
        <TabPanel value="budget" className="p-4">
          <p className="text-foreground">Budget & Cost details.</p>
        </TabPanel>
        <TabPanel value="schedule" className="p-4">
          <p className="text-foreground">Schedule timeline.</p>
        </TabPanel>
        <TabPanel value="resources" className="p-4">
          <p className="text-foreground">Resource allocation.</p>
        </TabPanel>
        <TabPanel value="documents" className="p-4">
          <p className="text-foreground">Attached documents.</p>
        </TabPanel>
      </TabPanels>
    </Tabs>
  ),
};

export const TwoTabs: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <TabList>
        <Tab value="overview">Overview</Tab>
        <Tab value="details">Details</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="overview" className="p-4">
          <p className="text-foreground">Overview panel content.</p>
        </TabPanel>
        <TabPanel value="details" className="p-4">
          <p className="text-foreground">Details panel content.</p>
        </TabPanel>
      </TabPanels>
    </Tabs>
  ),
};
