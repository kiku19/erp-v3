import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileText, Folder, Settings } from "lucide-react";
import { Typeahead } from "./typeahead";
import type { TypeaheadItem } from "./typeahead";

const items: TypeaheadItem[] = [
  { id: "1", label: "Documents", description: "View all documents", icon: <FileText size={16} /> },
  { id: "2", label: "Projects", description: "Manage projects", icon: <Folder size={16} /> },
  { id: "3", label: "Settings", description: "App settings", icon: <Settings size={16} /> },
  { id: "4", label: "Documentation", description: "Help docs" },
];

describe("Typeahead", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the search input with placeholder", () => {
    render(<Typeahead items={items} placeholder="Search..." />);
    expect(screen.getByPlaceholderText("Search...")).toBeDefined();
  });

  it("does not show suggestions when input is not focused", () => {
    render(<Typeahead items={items} />);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows suggestions when input is focused", async () => {
    const user = userEvent.setup();
    render(<Typeahead items={items} placeholder="Search..." />);
    await user.click(screen.getByPlaceholderText("Search..."));
    expect(screen.getByRole("listbox")).toBeDefined();
    const listItems = screen.getAllByRole("option");
    expect(listItems.length).toBe(4);
  });

  it("hides suggestions when input loses focus", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Typeahead items={items} placeholder="Search..." />
        <button>Outside</button>
      </div>,
    );
    await user.click(screen.getByPlaceholderText("Search..."));
    expect(screen.getByRole("listbox")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Outside" }));
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
  });

  it("filters items as user types", async () => {
    const user = userEvent.setup();
    render(<Typeahead items={items} placeholder="Search..." />);
    await user.type(screen.getByPlaceholderText("Search..."), "Doc");
    await waitFor(() => {
      const listItems = screen.getAllByRole("option");
      expect(listItems.length).toBe(2); // Documents + Documentation
    });
  });

  it("calls onSearch when typing", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<Typeahead items={items} onSearch={onSearch} placeholder="Search..." />);
    await user.type(screen.getByPlaceholderText("Search..."), "Pro");
    expect(onSearch).toHaveBeenCalledWith("Pro");
  });

  it("calls onChange when an item is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Typeahead items={items} onChange={onChange} placeholder="Search..." />);
    await user.click(screen.getByPlaceholderText("Search..."));
    await user.click(screen.getByText("Projects"));
    expect(onChange).toHaveBeenCalledWith(items[1]);
  });

  it("navigates suggestions with arrow keys", async () => {
    const user = userEvent.setup();
    render(<Typeahead items={items} placeholder="Search..." />);
    const input = screen.getByPlaceholderText("Search...");
    await user.click(input);
    await user.keyboard("{ArrowDown}");
    const options = screen.getAllByRole("option");
    expect(options[0].className).toContain("bg-primary-active");
    await user.keyboard("{ArrowDown}");
    expect(options[1].className).toContain("bg-primary-active");
    expect(options[0].className).not.toContain("bg-primary-active");
  });

  it("selects highlighted item with Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Typeahead items={items} onChange={onChange} placeholder="Search..." />);
    const input = screen.getByPlaceholderText("Search...");
    await user.click(input);
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(items[0]);
  });

  it("clears search with Escape", async () => {
    const user = userEvent.setup();
    render(<Typeahead items={items} placeholder="Search..." />);
    const input = screen.getByPlaceholderText("Search...");
    await user.type(input, "Doc");
    await user.keyboard("{Escape}");
    expect(input).toHaveProperty("value", "");
  });

  it("renders item descriptions when focused", async () => {
    const user = userEvent.setup();
    render(<Typeahead items={items} placeholder="Search..." />);
    await user.click(screen.getByPlaceholderText("Search..."));
    expect(screen.getByText("View all documents")).toBeDefined();
    expect(screen.getByText("Manage projects")).toBeDefined();
  });

  it("renders item icons when focused", async () => {
    const user = userEvent.setup();
    render(<Typeahead items={items} placeholder="Search..." />);
    await user.click(screen.getByPlaceholderText("Search..."));
    const options = screen.getAllByRole("option");
    const firstOptionSvg = options[0].querySelector("svg");
    expect(firstOptionSvg).not.toBeNull();
  });

  it("shows no items when search has no matches", async () => {
    const user = userEvent.setup();
    render(<Typeahead items={items} placeholder="Search..." />);
    await user.type(screen.getByPlaceholderText("Search..."), "zzzzz");
    await waitFor(() => {
      expect(screen.queryAllByRole("option").length).toBe(0);
    });
  });

  it("wraps arrow navigation at boundaries", async () => {
    const user = userEvent.setup();
    render(<Typeahead items={items} placeholder="Search..." />);
    const input = screen.getByPlaceholderText("Search...");
    await user.click(input);
    // Press ArrowUp when no item is highlighted - should go to last
    await user.keyboard("{ArrowUp}");
    const options = screen.getAllByRole("option");
    expect(options[options.length - 1].className).toContain("bg-primary-active");
  });

  it("merges custom className", () => {
    render(<Typeahead items={items} className="my-custom" />);
    const container = screen.getByPlaceholderText("Search...").closest("[class*='my-custom']");
    expect(container).not.toBeNull();
  });

  it("resets highlighted index when search changes", async () => {
    const user = userEvent.setup();
    render(<Typeahead items={items} placeholder="Search..." />);
    const input = screen.getByPlaceholderText("Search...");
    await user.click(input);
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    // Now type to filter - index should reset
    await user.type(input, "Set");
    await waitFor(() => {
      const options = screen.getAllByRole("option");
      expect(options.length).toBe(1);
      // No item should have active highlight after search change
      expect(options[0].className).not.toContain("bg-primary-active");
    });
  });

  it("closes dropdown after selecting an item", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Typeahead items={items} onChange={onChange} placeholder="Search..." />);
    await user.click(screen.getByPlaceholderText("Search..."));
    expect(screen.getByRole("listbox")).toBeDefined();
    await user.click(screen.getByText("Projects"));
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
  });

  it("populates input with selected item label", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Typeahead items={items} onChange={onChange} placeholder="Search..." />);
    const input = screen.getByPlaceholderText("Search...");
    await user.click(input);
    await user.click(screen.getByText("Projects"));
    expect(input).toHaveProperty("value", "Projects");
  });

  it("renders custom template via renderItem", async () => {
    const user = userEvent.setup();
    render(
      <Typeahead
        items={items}
        placeholder="Search..."
        renderItem={(item, isHighlighted) => (
          <div data-testid={`custom-${item.id}`}>
            <strong>{item.label}</strong>
            {isHighlighted && <span data-testid="highlight-badge">Active</span>}
          </div>
        )}
      />,
    );
    await user.click(screen.getByPlaceholderText("Search..."));
    // Custom template should render
    expect(screen.getByTestId("custom-1")).toBeDefined();
    expect(screen.getByTestId("custom-2")).toBeDefined();
    // Default icon/description layout should not render
    expect(screen.queryByText("View all documents")).toBeNull();
  });

  it("passes isHighlighted correctly to renderItem", async () => {
    const user = userEvent.setup();
    render(
      <Typeahead
        items={items}
        placeholder="Search..."
        renderItem={(item, isHighlighted) => (
          <div data-testid={`custom-${item.id}`}>
            {item.label}
            {isHighlighted && <span data-testid="highlight-badge">Active</span>}
          </div>
        )}
      />,
    );
    await user.click(screen.getByPlaceholderText("Search..."));
    expect(screen.queryByTestId("highlight-badge")).toBeNull();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByTestId("highlight-badge")).toBeDefined();
  });

  it("reopens dropdown when input is clicked after selecting an item", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Typeahead items={items} onChange={onChange} placeholder="Search..." />);
    const input = screen.getByPlaceholderText("Search...");
    await user.click(input);
    await user.click(screen.getByText("Projects"));
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
    // Click input again — dropdown should reopen
    await user.click(input);
    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeDefined();
    });
  });
});
