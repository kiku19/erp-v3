import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpotlightSearch } from "./spotlight-search";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

/* ─────────────────────── Test Data ──────────────────────────────── */

interface TestItem {
  id: string;
  name: string;
}

const items: TestItem[] = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
  { id: "3", name: "Charlie" },
];

const renderItem = (item: TestItem, isActive: boolean) => (
  <span data-testid={`rendered-${item.id}`}>{item.name}</span>
);

const filterFn = (item: TestItem, query: string) =>
  item.name.toLowerCase().includes(query.toLowerCase());

/* ─────────── Single Mode (backward compat) ──────────────────────── */

describe("SpotlightSearch — single mode", () => {
  it("renders search input and items list when open", () => {
    render(
      <SpotlightSearch
        open
        onClose={() => {}}
        placeholder="Search..."
        items={items}
        onSelect={() => {}}
        renderItem={renderItem}
      />,
    );

    expect(screen.getByTestId("spotlight-search-input")).toBeDefined();
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
    expect(screen.getByText("Charlie")).toBeDefined();
  });

  it("calls onSelect when clicking an item in single mode", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <SpotlightSearch
        open
        onClose={() => {}}
        placeholder="Search..."
        items={items}
        onSelect={onSelect}
        renderItem={renderItem}
      />,
    );

    await user.click(screen.getByTestId("spotlight-item-1"));
    expect(onSelect).toHaveBeenCalledWith(items[0]);
  });

  it("calls onSelect on Enter key in single mode", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <SpotlightSearch
        open
        onClose={() => {}}
        placeholder="Search..."
        items={items}
        onSelect={onSelect}
        renderItem={renderItem}
      />,
    );

    const input = screen.getByTestId("spotlight-search-input");
    await user.click(input);
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledWith(items[0]);
  });

  it("closes on Escape key", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <SpotlightSearch
        open
        onClose={onClose}
        placeholder="Search..."
        items={items}
        onSelect={() => {}}
        renderItem={renderItem}
      />,
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on backdrop click", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <SpotlightSearch
        open
        onClose={onClose}
        placeholder="Search..."
        items={items}
        onSelect={() => {}}
        renderItem={renderItem}
      />,
    );

    await user.click(screen.getByTestId("spotlight-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });

  it("filters items using filterFn", async () => {
    const user = userEvent.setup();

    render(
      <SpotlightSearch
        open
        onClose={() => {}}
        placeholder="Search..."
        items={items}
        onSelect={() => {}}
        renderItem={renderItem}
        filterFn={filterFn}
      />,
    );

    const input = screen.getByTestId("spotlight-search-input");
    await user.type(input, "ali");

    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.queryByText("Bob")).toBeNull();
    expect(screen.queryByText("Charlie")).toBeNull();
  });

  it("keyboard navigation changes active item", async () => {
    const user = userEvent.setup();

    render(
      <SpotlightSearch
        open
        onClose={() => {}}
        placeholder="Search..."
        items={items}
        onSelect={() => {}}
        renderItem={renderItem}
      />,
    );

    const input = screen.getByTestId("spotlight-search-input");
    await user.click(input);

    // First item is active by default
    const item1 = screen.getByTestId("spotlight-item-1");
    expect(item1.className.split(" ")).toContain("bg-muted");

    // Arrow down → second item active
    await user.keyboard("{ArrowDown}");
    const item2 = screen.getByTestId("spotlight-item-2");
    expect(item2.className.split(" ")).toContain("bg-muted");
    expect(item1.className.split(" ")).not.toContain("bg-muted");
  });
});

/* ─────────── Multi Mode ─────────────────────────────────────────── */

describe("SpotlightSearch — multi mode", () => {
  it("renders with wider layout and right selection panel", () => {
    render(
      <SpotlightSearch
        open
        mode="multi"
        onClose={() => {}}
        placeholder="Search..."
        items={items}
        onSelect={() => {}}
        onConfirm={() => {}}
        renderItem={renderItem}
      />,
    );

    expect(screen.getByTestId("spotlight-selection-panel")).toBeDefined();
  });

  it("clicking an item in multi mode adds it to selection (does not call onSelect)", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <SpotlightSearch
        open
        mode="multi"
        onClose={() => {}}
        placeholder="Search..."
        items={items}
        onSelect={onSelect}
        onConfirm={() => {}}
        renderItem={renderItem}
      />,
    );

    await user.click(screen.getByTestId("spotlight-item-1"));

    // Should NOT call onSelect in multi mode
    expect(onSelect).not.toHaveBeenCalled();

    // Should appear in selection panel
    const panel = screen.getByTestId("spotlight-selection-panel");
    expect(within(panel).getByText("Alice")).toBeDefined();
  });

  it("clicking a selected item in results removes it from selection", async () => {
    const user = userEvent.setup();

    render(
      <SpotlightSearch
        open
        mode="multi"
        onClose={() => {}}
        placeholder="Search..."
        items={items}
        onSelect={() => {}}
        onConfirm={() => {}}
        renderItem={renderItem}
      />,
    );

    // Select Alice
    await user.click(screen.getByTestId("spotlight-item-1"));
    const panel = screen.getByTestId("spotlight-selection-panel");
    expect(within(panel).getByText("Alice")).toBeDefined();

    // Click Alice again to deselect
    await user.click(screen.getByTestId("spotlight-item-1"));
    expect(within(panel).queryByText("Alice")).toBeNull();
  });

  it("selected items show in right panel with remove button", async () => {
    const user = userEvent.setup();

    render(
      <SpotlightSearch
        open
        mode="multi"
        onClose={() => {}}
        placeholder="Search..."
        items={items}
        onSelect={() => {}}
        onConfirm={() => {}}
        renderItem={renderItem}
      />,
    );

    await user.click(screen.getByTestId("spotlight-item-1"));
    await user.click(screen.getByTestId("spotlight-item-2"));

    const panel = screen.getByTestId("spotlight-selection-panel");
    expect(within(panel).getByText("Alice")).toBeDefined();
    expect(within(panel).getByText("Bob")).toBeDefined();

    // Each selected item should have a remove button
    const removeButtons = within(panel).getAllByLabelText(/Remove/);
    expect(removeButtons.length).toBe(2);
  });

  it("clicking remove button on a selected item deselects it", async () => {
    const user = userEvent.setup();

    render(
      <SpotlightSearch
        open
        mode="multi"
        onClose={() => {}}
        placeholder="Search..."
        items={items}
        onSelect={() => {}}
        onConfirm={() => {}}
        renderItem={renderItem}
      />,
    );

    await user.click(screen.getByTestId("spotlight-item-1"));
    const panel = screen.getByTestId("spotlight-selection-panel");
    expect(within(panel).getByText("Alice")).toBeDefined();

    // Click remove
    const removeBtn = within(panel).getByLabelText("Remove Alice");
    await user.click(removeBtn);

    expect(within(panel).queryByText("Alice")).toBeNull();
  });

  it("shows Selected (N) count in the right panel header", async () => {
    const user = userEvent.setup();

    render(
      <SpotlightSearch
        open
        mode="multi"
        onClose={() => {}}
        placeholder="Search..."
        items={items}
        onSelect={() => {}}
        onConfirm={() => {}}
        renderItem={renderItem}
      />,
    );

    const panel = screen.getByTestId("spotlight-selection-panel");
    expect(within(panel).getByText("Selected (0)")).toBeDefined();

    await user.click(screen.getByTestId("spotlight-item-1"));
    expect(within(panel).getByText("Selected (1)")).toBeDefined();

    await user.click(screen.getByTestId("spotlight-item-2"));
    expect(within(panel).getByText("Selected (2)")).toBeDefined();
  });

  it("confirm button calls onConfirm with all selected items", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <SpotlightSearch
        open
        mode="multi"
        onClose={() => {}}
        placeholder="Search..."
        items={items}
        onSelect={() => {}}
        onConfirm={onConfirm}
        renderItem={renderItem}
      />,
    );

    await user.click(screen.getByTestId("spotlight-item-1"));
    await user.click(screen.getByTestId("spotlight-item-3"));

    const confirmBtn = screen.getByTestId("spotlight-confirm-btn");
    await user.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith([items[0], items[2]]);
  });

  it("cancel button calls onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <SpotlightSearch
        open
        mode="multi"
        onClose={onClose}
        placeholder="Search..."
        items={items}
        onSelect={() => {}}
        onConfirm={() => {}}
        renderItem={renderItem}
      />,
    );

    const cancelBtn = screen.getByTestId("spotlight-cancel-btn");
    await user.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it("Enter key toggles item selection in multi mode", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <SpotlightSearch
        open
        mode="multi"
        onClose={() => {}}
        placeholder="Search..."
        items={items}
        onSelect={onSelect}
        onConfirm={() => {}}
        renderItem={renderItem}
      />,
    );

    const input = screen.getByTestId("spotlight-search-input");
    await user.click(input);

    // Enter to select first item
    await user.keyboard("{Enter}");
    expect(onSelect).not.toHaveBeenCalled();
    const panel = screen.getByTestId("spotlight-selection-panel");
    expect(within(panel).getByText("Alice")).toBeDefined();

    // Enter again to deselect
    await user.keyboard("{Enter}");
    expect(within(panel).queryByText("Alice")).toBeNull();
  });

  it("items already selected show check indicator in results list", async () => {
    const user = userEvent.setup();

    render(
      <SpotlightSearch
        open
        mode="multi"
        onClose={() => {}}
        placeholder="Search..."
        items={items}
        onSelect={() => {}}
        onConfirm={() => {}}
        renderItem={renderItem}
      />,
    );

    await user.click(screen.getByTestId("spotlight-item-1"));

    // The selected item in results should have a check indicator
    const item1 = screen.getByTestId("spotlight-item-1");
    const check = within(item1).getByTestId("spotlight-check-1");
    expect(check).toBeDefined();

    // Unselected items should not have check
    const item2 = screen.getByTestId("spotlight-item-2");
    expect(within(item2).queryByTestId("spotlight-check-2")).toBeNull();
  });

  it("footer shows toggle and confirm hints in multi mode", () => {
    render(
      <SpotlightSearch
        open
        mode="multi"
        onClose={() => {}}
        placeholder="Search..."
        items={items}
        onSelect={() => {}}
        onConfirm={() => {}}
        renderItem={renderItem}
      />,
    );

    expect(screen.getByText("toggle")).toBeDefined();
    expect(screen.getByText("confirm")).toBeDefined();
  });
});
