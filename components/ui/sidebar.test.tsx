import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayoutDashboard } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarNav,
  SidebarFooter,
  NavItem,
  NavSubItem,
  NavSectionTitle,
  NavDivider,
} from "./sidebar";

afterEach(() => {
  cleanup();
});

describe("Sidebar", () => {
  it("renders with default expanded width", () => {
    render(
      <Sidebar>
        <div>content</div>
      </Sidebar>,
    );
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar.className).toContain("w-[260px]");
  });

  it("renders with collapsed width when collapsed prop is true", () => {
    render(
      <Sidebar collapsed>
        <div>content</div>
      </Sidebar>,
    );
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar.className).toContain("w-16");
  });

  it("has bg-background and border-right", () => {
    render(
      <Sidebar>
        <div>content</div>
      </Sidebar>,
    );
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar.className).toContain("bg-background");
    expect(sidebar.className).toContain("border-r");
    expect(sidebar.className).toContain("border-border");
  });

  it("has transition for width animation", () => {
    render(
      <Sidebar>
        <div>content</div>
      </Sidebar>,
    );
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar.className).toContain("transition-all");
    expect(sidebar.className).toContain("duration-[var(--duration-slow)]");
  });

  it("merges custom className", () => {
    render(
      <Sidebar className="my-custom">
        <div>content</div>
      </Sidebar>,
    );
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar.className).toContain("my-custom");
  });
});

describe("SidebarHeader", () => {
  it("renders logo and brand text", () => {
    render(<SidebarHeader brand="ERP System" />);
    expect(screen.getByText("E")).toBeDefined();
    expect(screen.getByText("ERP System")).toBeDefined();
  });

  it("hides brand text when collapsed via opacity", () => {
    render(<SidebarHeader brand="ERP System" collapsed />);
    expect(screen.getByText("E")).toBeDefined();
    const brand = screen.getByText("ERP System");
    expect(brand.className).toContain("opacity-0");
  });

  it("renders custom logo when provided", () => {
    render(
      <SidebarHeader logo={<span data-testid="custom-logo">X</span>} brand="Test" />,
    );
    expect(screen.getByTestId("custom-logo")).toBeDefined();
  });
});

describe("NavItem", () => {
  it("renders icon and label", () => {
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" />,
    );
    expect(screen.getByText("Dashboard")).toBeDefined();
  });

  it("applies active state classes", () => {
    render(
      <NavItem
        icon={<LayoutDashboard size={18} />}
        label="Dashboard"
        active
      />,
    );
    const item = screen.getByTestId("nav-item");
    expect(item.className).toContain("bg-primary-active");
  });

  it("hides label when collapsed via opacity", () => {
    render(
      <NavItem
        icon={<LayoutDashboard size={18} />}
        label="Dashboard"
        collapsed
      />,
    );
    const label = screen.getByText("Dashboard");
    expect(label.className).toContain("opacity-0");
  });

  it("renders as a link when href is provided", () => {
    render(
      <NavItem
        icon={<LayoutDashboard size={18} />}
        label="Dashboard"
        href="/dashboard"
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/dashboard");
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <NavItem
        icon={<LayoutDashboard size={18} />}
        label="Dashboard"
        onClick={handleClick}
      />,
    );
    await user.click(screen.getByTestId("nav-item"));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("has hover transition classes", () => {
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" />,
    );
    const item = screen.getByTestId("nav-item");
    expect(item.className).toContain("hover:bg-muted-hover");
    expect(item.className).toContain("transition-all");
  });

  it("keeps consistent padding when collapsed (icon stays in place)", () => {
    render(
      <NavItem
        icon={<LayoutDashboard size={18} />}
        label="Dashboard"
        collapsed
      />,
    );
    const item = screen.getByTestId("nav-item");
    expect(item.className).toContain("px-3");
    expect(item.className).toContain("overflow-hidden");
  });
});

describe("NavSubItem", () => {
  it("renders label text", () => {
    render(<NavSubItem label="All Products" />);
    expect(screen.getByText("All Products")).toBeDefined();
  });

  it("renders as a link when href is provided", () => {
    render(<NavSubItem label="All Products" href="/products" />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/products");
  });

  it("applies active styling", () => {
    render(<NavSubItem label="All Products" active />);
    const item = screen.getByTestId("nav-sub-item");
    expect(item.className).toContain("bg-primary-active");
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<NavSubItem label="All Products" onClick={handleClick} />);
    await user.click(screen.getByTestId("nav-sub-item"));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});

describe("NavItem with sub-items (expanded mode)", () => {
  it("shows chevron indicator when it has children", () => {
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products">
        <NavSubItem label="All Products" />
        <NavSubItem label="Categories" />
      </NavItem>,
    );
    expect(screen.getByTestId("nav-item-chevron")).toBeDefined();
  });

  it("sub-items container always rendered with grid animation", () => {
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products">
        <NavSubItem label="All Products" />
      </NavItem>,
    );
    const subContainer = screen.getByTestId("nav-sub-items");
    expect(subContainer.className).toContain("grid");
    expect(subContainer.className).toContain("transition-[grid-template-rows]");
  });

  it("sub-items container has 0fr rows when collapsed (not expanded)", () => {
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products">
        <NavSubItem label="All Products" />
      </NavItem>,
    );
    const subContainer = screen.getByTestId("nav-sub-items");
    expect(subContainer.className).toContain("grid-rows-[0fr]");
  });

  it("sub-items container has 1fr rows when expanded", async () => {
    const user = userEvent.setup();
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products">
        <NavSubItem label="All Products" />
      </NavItem>,
    );
    await user.click(screen.getByTestId("nav-item"));
    const subContainer = screen.getByTestId("nav-sub-items");
    expect(subContainer.className).toContain("grid-rows-[1fr]");
  });

  it("sub-items inner wrapper has overflow-hidden for animation", () => {
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products">
        <NavSubItem label="All Products" />
      </NavItem>,
    );
    const inner = screen.getByTestId("nav-sub-items-inner");
    expect(inner.className).toContain("overflow-hidden");
  });

  it("toggles expanded state on click", async () => {
    const user = userEvent.setup();
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products">
        <NavSubItem label="All Products" />
      </NavItem>,
    );
    const subContainer = screen.getByTestId("nav-sub-items");
    expect(subContainer.className).toContain("grid-rows-[0fr]");

    await user.click(screen.getByTestId("nav-item"));
    expect(subContainer.className).toContain("grid-rows-[1fr]");

    await user.click(screen.getByTestId("nav-item"));
    expect(subContainer.className).toContain("grid-rows-[0fr]");
  });
});

describe("NavItem flyout (collapsed mode)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does NOT show flyout for items without children", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" collapsed />,
    );
    // Item without children should render directly, no wrapper
    expect(screen.queryByTestId("nav-item-wrapper")).toBeNull();
    expect(screen.getByTestId("nav-item")).toBeDefined();
  });

  it("only shows flyout for items WITH children", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products" collapsed>
        <NavSubItem label="All Products" />
      </NavItem>,
    );
    // Has wrapper because it has children
    expect(screen.getByTestId("nav-item-wrapper")).toBeDefined();

    await user.hover(screen.getByTestId("nav-item-wrapper"));
    expect(screen.getByTestId("nav-flyout")).toBeDefined();
  });

  it("renders flyout via portal into document.body on hover", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <Sidebar collapsed>
        <SidebarNav>
          <NavItem icon={<LayoutDashboard size={18} />} label="Products" collapsed>
            <NavSubItem label="All Products" />
          </NavItem>
        </SidebarNav>
      </Sidebar>,
    );
    expect(screen.queryByTestId("nav-flyout")).toBeNull();

    await user.hover(screen.getByTestId("nav-item-wrapper"));
    const flyout = screen.getByTestId("nav-flyout");
    expect(flyout).toBeDefined();

    // Flyout should be in document.body, NOT inside the sidebar
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar.contains(flyout)).toBe(false);
    expect(document.body.contains(flyout)).toBe(true);
  });

  it("flyout has animation classes for smooth appearance", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products" collapsed>
        <NavSubItem label="All Products" />
      </NavItem>,
    );
    await user.hover(screen.getByTestId("nav-item-wrapper"));
    const flyout = screen.getByTestId("nav-flyout");
    expect(flyout.className).toContain("animate-flyout-in");
  });

  it("shows label as flyout header", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products" collapsed>
        <NavSubItem label="All Products" />
      </NavItem>,
    );
    await user.hover(screen.getByTestId("nav-item-wrapper"));
    const header = screen.getByTestId("nav-flyout-header");
    expect(header.textContent).toBe("Products");
  });

  it("shows sub-items in flyout", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products" collapsed>
        <NavSubItem label="All Products" />
        <NavSubItem label="Categories" />
      </NavItem>,
    );
    await user.hover(screen.getByTestId("nav-item-wrapper"));
    expect(screen.getByText("All Products")).toBeDefined();
    expect(screen.getByText("Categories")).toBeDefined();
  });

  it("keeps flyout open during hover gap (delayed hide)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products" collapsed>
        <NavSubItem label="All Products" />
      </NavItem>,
    );
    await user.hover(screen.getByTestId("nav-item-wrapper"));
    expect(screen.getByTestId("nav-flyout")).toBeDefined();

    // Mouse leaves the wrapper — flyout should still be visible during grace period
    await user.unhover(screen.getByTestId("nav-item-wrapper"));
    expect(screen.getByTestId("nav-flyout")).toBeDefined();

    // Mouse enters flyout within grace period — should stay open
    await user.hover(screen.getByTestId("nav-flyout"));
    vi.advanceTimersByTime(200);
    expect(screen.getByTestId("nav-flyout")).toBeDefined();
  });

  it("hides flyout after delay when mouse leaves both wrapper and flyout", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products" collapsed>
        <NavSubItem label="All Products" />
      </NavItem>,
    );
    await user.hover(screen.getByTestId("nav-item-wrapper"));
    expect(screen.getByTestId("nav-flyout")).toBeDefined();

    // Mouse leaves wrapper
    await user.unhover(screen.getByTestId("nav-item-wrapper"));
    // Advance past the grace period without entering flyout
    await act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByTestId("nav-flyout")).toBeNull();
  });

  it("sub-items in flyout are clickable", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const handleClick = vi.fn();
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products" collapsed>
        <NavSubItem label="All Products" onClick={handleClick} />
      </NavItem>,
    );
    await user.hover(screen.getByTestId("nav-item-wrapper"));
    const flyout = screen.getByTestId("nav-flyout");

    // Move mouse to flyout, then click the sub-item
    await user.hover(flyout);
    await user.click(screen.getByText("All Products"));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("flyout uses fixed positioning for portal placement", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products" collapsed>
        <NavSubItem label="All Products" />
      </NavItem>,
    );
    await user.hover(screen.getByTestId("nav-item-wrapper"));
    const flyout = screen.getByTestId("nav-flyout");
    expect(flyout.className).toContain("fixed");
    expect(flyout.className).toContain("z-50");
  });
});

describe("NavSectionTitle", () => {
  it("renders section title text", () => {
    render(<NavSectionTitle>MAIN</NavSectionTitle>);
    expect(screen.getByText("MAIN")).toBeDefined();
  });

  it("is hidden when collapsed via opacity", () => {
    render(<NavSectionTitle collapsed>MAIN</NavSectionTitle>);
    const title = screen.getByText("MAIN");
    expect(title.className).toContain("opacity-0");
  });

  it("has correct styling", () => {
    render(<NavSectionTitle>MAIN</NavSectionTitle>);
    const title = screen.getByText("MAIN");
    expect(title.className).toContain("text-muted-foreground");
    expect(title.className).toContain("uppercase");
  });
});

describe("NavDivider", () => {
  it("renders a divider line", () => {
    render(<NavDivider />);
    const divider = screen.getByTestId("nav-divider");
    expect(divider.className).toContain("bg-border");
  });

  it("has reduced width when collapsed", () => {
    render(<NavDivider collapsed />);
    const divider = screen.getByTestId("nav-divider");
    expect(divider.className).toContain("w-8");
  });
});

describe("SidebarFooter", () => {
  it("renders avatar initials, name, and role", () => {
    render(<SidebarFooter initials="JD" name="John Doe" role="Admin" />);
    expect(screen.getByText("JD")).toBeDefined();
    expect(screen.getByText("John Doe")).toBeDefined();
    expect(screen.getByText("Admin")).toBeDefined();
  });

  it("hides name and role when collapsed via opacity", () => {
    render(<SidebarFooter initials="JD" name="John Doe" role="Admin" collapsed />);
    expect(screen.getByText("JD")).toBeDefined();
    const name = screen.getByText("John Doe");
    expect(name.parentElement?.className).toContain("opacity-0");
    const role = screen.getByText("Admin");
    expect(role.parentElement?.className).toContain("opacity-0");
  });

  it("has border-top", () => {
    render(<SidebarFooter initials="JD" name="John Doe" role="Admin" />);
    const footer = screen.getByTestId("sidebar-footer");
    expect(footer.className).toContain("border-t");
    expect(footer.className).toContain("border-border");
  });
});

describe("SidebarNav", () => {
  it("renders children inside a nav element", () => {
    render(
      <SidebarNav>
        <div>nav content</div>
      </SidebarNav>,
    );
    const nav = screen.getByRole("navigation");
    expect(nav).toBeDefined();
    expect(screen.getByText("nav content")).toBeDefined();
  });
});
