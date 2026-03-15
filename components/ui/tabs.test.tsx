import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "./tabs";

afterEach(cleanup);

describe("Tabs", () => {
  it("renders tab list with tabs", () => {
    render(
      <Tabs defaultValue="general">
        <TabList>
          <Tab value="general">General</Tab>
          <Tab value="budget">Budget</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="general">General content</TabPanel>
          <TabPanel value="budget">Budget content</TabPanel>
        </TabPanels>
      </Tabs>,
    );

    expect(screen.getByText("General")).toBeTruthy();
    expect(screen.getByText("Budget")).toBeTruthy();
  });

  it("shows the default tab panel", () => {
    render(
      <Tabs defaultValue="general">
        <TabList>
          <Tab value="general">General</Tab>
          <Tab value="budget">Budget</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="general">General content</TabPanel>
          <TabPanel value="budget">Budget content</TabPanel>
        </TabPanels>
      </Tabs>,
    );

    expect(screen.getByText("General content")).toBeTruthy();
    expect(screen.queryByText("Budget content")).toBeNull();
  });

  it("switches tab on click", () => {
    render(
      <Tabs defaultValue="general">
        <TabList>
          <Tab value="general">General</Tab>
          <Tab value="budget">Budget</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="general">General content</TabPanel>
          <TabPanel value="budget">Budget content</TabPanel>
        </TabPanels>
      </Tabs>,
    );

    fireEvent.click(screen.getByText("Budget"));

    expect(screen.queryByText("General content")).toBeNull();
    expect(screen.getByText("Budget content")).toBeTruthy();
  });

  it("marks active tab with aria-selected", () => {
    render(
      <Tabs defaultValue="general">
        <TabList>
          <Tab value="general">General</Tab>
          <Tab value="budget">Budget</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="general">General content</TabPanel>
          <TabPanel value="budget">Budget content</TabPanel>
        </TabPanels>
      </Tabs>,
    );

    const generalTab = screen.getByRole("tab", { name: "General" });
    const budgetTab = screen.getByRole("tab", { name: "Budget" });

    expect(generalTab.getAttribute("aria-selected")).toBe("true");
    expect(budgetTab.getAttribute("aria-selected")).toBe("false");
  });

  it("applies active styles to selected tab", () => {
    render(
      <Tabs defaultValue="general">
        <TabList>
          <Tab value="general">General</Tab>
          <Tab value="budget">Budget</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="general">General content</TabPanel>
          <TabPanel value="budget">Budget content</TabPanel>
        </TabPanels>
      </Tabs>,
    );

    const generalTab = screen.getByRole("tab", { name: "General" });
    expect(generalTab.className).toContain("font-semibold");
    expect(generalTab.className).toContain("text-foreground");
  });

  it("calls onChange when tab changes", () => {
    const onChange = vi.fn();

    render(
      <Tabs defaultValue="general" onChange={onChange}>
        <TabList>
          <Tab value="general">General</Tab>
          <Tab value="budget">Budget</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="general">General content</TabPanel>
          <TabPanel value="budget">Budget content</TabPanel>
        </TabPanels>
      </Tabs>,
    );

    fireEvent.click(screen.getByText("Budget"));
    expect(onChange).toHaveBeenCalledWith("budget");
  });

  it("supports controlled value", () => {
    const { rerender } = render(
      <Tabs value="general">
        <TabList>
          <Tab value="general">General</Tab>
          <Tab value="budget">Budget</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="general">General content</TabPanel>
          <TabPanel value="budget">Budget content</TabPanel>
        </TabPanels>
      </Tabs>,
    );

    expect(screen.getByText("General content")).toBeTruthy();

    rerender(
      <Tabs value="budget">
        <TabList>
          <Tab value="general">General</Tab>
          <Tab value="budget">Budget</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="general">General content</TabPanel>
          <TabPanel value="budget">Budget content</TabPanel>
        </TabPanels>
      </Tabs>,
    );

    expect(screen.getByText("Budget content")).toBeTruthy();
    expect(screen.queryByText("General content")).toBeNull();
  });

  it("applies custom className to TabList", () => {
    render(
      <Tabs defaultValue="general">
        <TabList className="custom-class">
          <Tab value="general">General</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="general">Content</TabPanel>
        </TabPanels>
      </Tabs>,
    );

    expect(screen.getByRole("tablist").className).toContain("custom-class");
  });

  it("renders tabpanel with correct role", () => {
    render(
      <Tabs defaultValue="general">
        <TabList>
          <Tab value="general">General</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="general">Content</TabPanel>
        </TabPanels>
      </Tabs>,
    );

    expect(screen.getByRole("tabpanel")).toBeTruthy();
  });
});
