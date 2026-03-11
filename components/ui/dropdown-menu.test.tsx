import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Settings, User, LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuItem, DropdownMenuDivider } from "./dropdown-menu";

function renderMenu(props?: { align?: "start" | "end" }) {
  const onClick = vi.fn();
  render(
    <DropdownMenu trigger={<button>Open Menu</button>} {...props}>
      <DropdownMenuItem icon={<User size={16} />} onClick={onClick}>
        Profile
      </DropdownMenuItem>
      <DropdownMenuItem icon={<Settings size={16} />}>
        Settings
      </DropdownMenuItem>
      <DropdownMenuDivider />
      <DropdownMenuItem icon={<LogOut size={16} />} disabled>
        Logout
      </DropdownMenuItem>
    </DropdownMenu>,
  );
  return { onClick };
}

describe("DropdownMenu", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the trigger element", () => {
    renderMenu();
    expect(screen.getByRole("button", { name: "Open Menu" })).toBeDefined();
  });

  it("does not show menu content by default", () => {
    renderMenu();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens the menu when trigger is clicked", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Open Menu" }));
    expect(screen.getByRole("menu")).toBeDefined();
  });

  it("closes the menu when trigger is clicked again", async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole("button", { name: "Open Menu" });
    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeDefined();
    await user.click(trigger);
    await waitFor(() => {
      expect(screen.queryByRole("menu")).toBeNull();
    });
  });

  it("closes the menu when Escape is pressed", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Open Menu" }));
    expect(screen.getByRole("menu")).toBeDefined();
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("menu")).toBeNull();
    });
  });

  it("closes the menu when clicking outside", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Open Menu" }));
    expect(screen.getByRole("menu")).toBeDefined();
    await user.click(document.body);
    await waitFor(() => {
      expect(screen.queryByRole("menu")).toBeNull();
    });
  });

  it("renders menu items with correct roles", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Open Menu" }));
    const items = screen.getAllByRole("menuitem");
    expect(items.length).toBe(3);
  });

  it("calls onClick handler when a menu item is clicked", async () => {
    const user = userEvent.setup();
    const { onClick } = renderMenu();
    await user.click(screen.getByRole("button", { name: "Open Menu" }));
    await user.click(screen.getByText("Profile"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick for disabled items", async () => {
    const user = userEvent.setup();
    const onDisabledClick = vi.fn();
    render(
      <DropdownMenu trigger={<button>Open</button>}>
        <DropdownMenuItem onClick={onDisabledClick} disabled>
          Disabled Item
        </DropdownMenuItem>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByText("Disabled Item"));
    expect(onDisabledClick).not.toHaveBeenCalled();
  });

  it("navigates items with arrow keys", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Open Menu" }));
    const items = screen.getAllByRole("menuitem");
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(items[0]);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(items[1]);
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(items[0]);
  });

  it("selects item with Enter key", async () => {
    const user = userEvent.setup();
    const { onClick } = renderMenu();
    await user.click(screen.getByRole("button", { name: "Open Menu" }));
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders active menu item with active styles", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu trigger={<button>Open</button>}>
        <DropdownMenuItem active>Active Item</DropdownMenuItem>
        <DropdownMenuItem>Normal Item</DropdownMenuItem>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    const activeItem = screen.getByText("Active Item").closest("[role='menuitem']");
    expect(activeItem?.className).toContain("bg-accent");
    expect(activeItem?.className).toContain("text-accent-foreground");
  });

  it("renders the divider", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Open Menu" }));
    const divider = screen.getByRole("separator");
    expect(divider).toBeDefined();
    expect(divider.className).toContain("bg-border");
  });

  it("merges custom className on the container", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu trigger={<button>Open</button>} className="my-custom">
        <DropdownMenuItem>Item</DropdownMenuItem>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    const menu = screen.getByRole("menu");
    expect(menu.className).toContain("my-custom");
  });

  it("closes menu after selecting an item", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Open Menu" }));
    await user.click(screen.getByText("Profile"));
    await waitFor(() => {
      expect(screen.queryByRole("menu")).toBeNull();
    });
  });
});
