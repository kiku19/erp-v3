import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { WbsIconSettingsModal } from "./wbs-icon-settings-modal";
import { DEFAULT_ICON_ORDER, ALL_ICON_NAMES } from "./wbs-icon-map";

describe("WbsIconSettingsModal", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    icons: DEFAULT_ICON_ORDER,
    onSave: vi.fn(),
  };

  afterEach(() => cleanup());

  it("renders modal with title when open", () => {
    render(<WbsIconSettingsModal {...defaultProps} />);
    expect(screen.getByText("WBS Icon Settings")).toBeDefined();
  });

  it("renders all available icon toggle buttons", () => {
    render(<WbsIconSettingsModal {...defaultProps} />);
    for (const name of ALL_ICON_NAMES) {
      expect(screen.getByTestId(`icon-toggle-${name}`)).toBeDefined();
    }
  });

  it("shows cycle order items for selected icons", () => {
    render(<WbsIconSettingsModal {...defaultProps} />);
    for (const name of DEFAULT_ICON_ORDER) {
      expect(screen.getByTestId(`cycle-item-${name}`)).toBeDefined();
    }
  });

  it("toggles an icon off when clicked", () => {
    render(<WbsIconSettingsModal {...defaultProps} />);
    // "Folder" is in default order, click to remove
    fireEvent.click(screen.getByTestId("icon-toggle-Folder"));
    expect(screen.queryByTestId("cycle-item-Folder")).toBeNull();
  });

  it("toggles an icon on when clicked", () => {
    render(<WbsIconSettingsModal {...defaultProps} />);
    // "Box" is not in default order
    expect(screen.queryByTestId("cycle-item-Box")).toBeNull();
    fireEvent.click(screen.getByTestId("icon-toggle-Box"));
    expect(screen.getByTestId("cycle-item-Box")).toBeDefined();
  });

  it("moves icon up in cycle order", () => {
    render(<WbsIconSettingsModal {...defaultProps} />);
    // "FolderOpen" is at index 1, move it up to index 0
    fireEvent.click(screen.getByTestId("move-up-FolderOpen"));

    const items = screen.getAllByTestId(/^cycle-item-/);
    expect(items[0].getAttribute("data-testid")).toBe("cycle-item-FolderOpen");
    expect(items[1].getAttribute("data-testid")).toBe("cycle-item-Folder");
  });

  it("moves icon down in cycle order", () => {
    render(<WbsIconSettingsModal {...defaultProps} />);
    // "Folder" is at index 0, move it down to index 1
    fireEvent.click(screen.getByTestId("move-down-Folder"));

    const items = screen.getAllByTestId(/^cycle-item-/);
    expect(items[0].getAttribute("data-testid")).toBe("cycle-item-FolderOpen");
    expect(items[1].getAttribute("data-testid")).toBe("cycle-item-Folder");
  });

  it("resets to defaults", () => {
    render(<WbsIconSettingsModal {...defaultProps} icons={["Star"]} />);
    // Only Star in cycle
    expect(screen.queryByTestId("cycle-item-Folder")).toBeNull();

    fireEvent.click(screen.getByText("Reset to Defaults"));

    for (const name of DEFAULT_ICON_ORDER) {
      expect(screen.getByTestId(`cycle-item-${name}`)).toBeDefined();
    }
  });

  it("calls onSave and onClose when Save is clicked", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<WbsIconSettingsModal {...defaultProps} onSave={onSave} onClose={onClose} />);

    fireEvent.click(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledWith(DEFAULT_ICON_ORDER);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(<WbsIconSettingsModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("disables Save when no icons are selected", () => {
    // Start with just one icon and remove it
    render(<WbsIconSettingsModal {...defaultProps} icons={["Star"]} />);
    fireEvent.click(screen.getByTestId("icon-toggle-Star"));

    const saveBtn = screen.getByText("Save");
    expect(saveBtn.hasAttribute("disabled")).toBe(true);
  });
});
