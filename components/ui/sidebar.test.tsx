import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
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
  SidebarTrigger,
  useSidebarAutoHide,
} from "./sidebar";
import { renderHook } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

describe("Sidebar", () => {
  it("renders with fixed positioning and w-16", () => {
    render(
      <Sidebar visible>
        <div>content</div>
      </Sidebar>,
    );
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar.className).toContain("fixed");
    expect(sidebar.className).toContain("w-16");
  });

  it("has z-40 for floating overlay", () => {
    render(
      <Sidebar visible>
        <div>content</div>
      </Sidebar>,
    );
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar.className).toContain("z-40");
  });

  it("applies slide-in animation when visible", () => {
    render(
      <Sidebar visible>
        <div>content</div>
      </Sidebar>,
    );
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar.className).toContain("animate-sidebar-in");
  });

  it("applies slide-out animation when closing", () => {
    render(
      <Sidebar visible={false} isClosing>
        <div>content</div>
      </Sidebar>,
    );
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar.className).toContain("animate-sidebar-out");
  });

  it("does not render when not visible and not closing", () => {
    render(
      <Sidebar visible={false}>
        <div>content</div>
      </Sidebar>,
    );
    expect(screen.queryByTestId("sidebar")).toBeNull();
  });

  it("has bg-background and border-right", () => {
    render(
      <Sidebar visible>
        <div>content</div>
      </Sidebar>,
    );
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar.className).toContain("bg-background");
    expect(sidebar.className).toContain("border-r");
    expect(sidebar.className).toContain("border-border");
  });

  it("merges custom className", () => {
    render(
      <Sidebar visible className="my-custom">
        <div>content</div>
      </Sidebar>,
    );
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar.className).toContain("my-custom");
  });

  it("calls onMouseEnter and onMouseLeave", async () => {
    const user = userEvent.setup();
    const onEnter = vi.fn();
    const onLeave = vi.fn();
    render(
      <Sidebar visible onMouseEnter={onEnter} onMouseLeave={onLeave}>
        <div>content</div>
      </Sidebar>,
    );
    await user.hover(screen.getByTestId("sidebar"));
    expect(onEnter).toHaveBeenCalled();
    await user.unhover(screen.getByTestId("sidebar"));
    expect(onLeave).toHaveBeenCalled();
  });
});

describe("SidebarTrigger", () => {
  it("renders an invisible fixed div in top-left", () => {
    render(<SidebarTrigger onReveal={() => {}} />);
    const trigger = screen.getByTestId("sidebar-trigger");
    expect(trigger.className).toContain("fixed");
    expect(trigger.className).toContain("top-0");
    expect(trigger.className).toContain("left-0");
  });

  it("calls onReveal on mouseenter", async () => {
    const user = userEvent.setup();
    const onReveal = vi.fn();
    render(<SidebarTrigger onReveal={onReveal} />);
    await user.hover(screen.getByTestId("sidebar-trigger"));
    expect(onReveal).toHaveBeenCalledOnce();
  });
});

describe("useSidebarAutoHide", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with visible true and auto-hides after 1 second", () => {
    const { result } = renderHook(() => useSidebarAutoHide());
    expect(result.current.visible).toBe(true);
    expect(result.current.isClosing).toBe(false);

    // Starts closing at 1 second (default delay)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.isClosing).toBe(true);

    // Fully hidden after animation (300ms)
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current.visible).toBe(false);
    expect(result.current.isClosing).toBe(false);
  });

  it("show() makes sidebar visible after it was hidden", () => {
    const { result } = renderHook(() => useSidebarAutoHide());
    // Wait for auto-hide to complete
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.visible).toBe(false);

    act(() => {
      result.current.show();
    });
    expect(result.current.visible).toBe(true);
  });

  it("hide() sets isClosing and then hides after animation", () => {
    const { result } = renderHook(() => useSidebarAutoHide());
    act(() => {
      result.current.hide();
    });
    expect(result.current.isClosing).toBe(true);
    expect(result.current.visible).toBe(true);

    // After animation duration (300ms)
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current.visible).toBe(false);
    expect(result.current.isClosing).toBe(false);
  });

  it("startHideTimer starts 1-second countdown then hides", () => {
    const { result } = renderHook(() => useSidebarAutoHide());
    // Cancel the auto-start timer first
    act(() => {
      result.current.cancelHideTimer();
    });
    act(() => {
      result.current.startHideTimer();
    });

    // Still visible at 500ms
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.visible).toBe(true);

    // Starts closing at 1 second
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.isClosing).toBe(true);
  });

  it("cancelHideTimer prevents auto-hide", () => {
    const { result } = renderHook(() => useSidebarAutoHide());
    // Cancel the auto-start timer immediately
    act(() => {
      result.current.cancelHideTimer();
    });

    // Even after 10 seconds, should stay visible
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.visible).toBe(true);
    expect(result.current.isClosing).toBe(false);
  });

  it("respects custom delay", () => {
    const { result } = renderHook(() => useSidebarAutoHide(2000));
    // Cancel auto-start, then manually start
    act(() => {
      result.current.cancelHideTimer();
    });
    act(() => {
      result.current.startHideTimer();
    });

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.visible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.isClosing).toBe(true);
  });
});

describe("SidebarHeader", () => {
  it("renders logo and hides brand text (always collapsed)", () => {
    render(<SidebarHeader brand="ERP System" />);
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

  it("label has opacity-0 (always collapsed style)", () => {
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" />,
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

  it("has aria-label for accessibility", () => {
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" />,
    );
    const item = screen.getByTestId("nav-item");
    expect(item.getAttribute("aria-label")).toBe("Dashboard");
  });
});

describe("NavItem with sub-items (flyout mode)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows flyout on hover for items with children", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products">
        <NavSubItem label="All Products" />
      </NavItem>,
    );
    expect(screen.getByTestId("nav-item-wrapper")).toBeDefined();
    await user.hover(screen.getByTestId("nav-item-wrapper"));
    expect(screen.getByTestId("nav-flyout")).toBeDefined();
  });

  it("renders flyout via portal into document.body", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <Sidebar visible>
        <SidebarNav>
          <NavItem icon={<LayoutDashboard size={18} />} label="Products">
            <NavSubItem label="All Products" />
          </NavItem>
        </SidebarNav>
      </Sidebar>,
    );
    await user.hover(screen.getByTestId("nav-item-wrapper"));
    const flyout = screen.getByTestId("nav-flyout");
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar.contains(flyout)).toBe(false);
    expect(document.body.contains(flyout)).toBe(true);
  });

  it("flyout has animation classes", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products">
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
      <NavItem icon={<LayoutDashboard size={18} />} label="Products">
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
      <NavItem icon={<LayoutDashboard size={18} />} label="Products">
        <NavSubItem label="All Products" />
        <NavSubItem label="Categories" />
      </NavItem>,
    );
    await user.hover(screen.getByTestId("nav-item-wrapper"));
    expect(screen.getByText("All Products")).toBeDefined();
    expect(screen.getByText("Categories")).toBeDefined();
  });

  it("keeps flyout open during hover gap", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products">
        <NavSubItem label="All Products" />
      </NavItem>,
    );
    await user.hover(screen.getByTestId("nav-item-wrapper"));
    expect(screen.getByTestId("nav-flyout")).toBeDefined();

    await user.unhover(screen.getByTestId("nav-item-wrapper"));
    expect(screen.getByTestId("nav-flyout")).toBeDefined();

    await user.hover(screen.getByTestId("nav-flyout"));
    vi.advanceTimersByTime(200);
    expect(screen.getByTestId("nav-flyout")).toBeDefined();
  });

  it("hides flyout after delay when mouse leaves", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products">
        <NavSubItem label="All Products" />
      </NavItem>,
    );
    await user.hover(screen.getByTestId("nav-item-wrapper"));
    expect(screen.getByTestId("nav-flyout")).toBeDefined();

    await user.unhover(screen.getByTestId("nav-item-wrapper"));
    await act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByTestId("nav-flyout")).toBeNull();
  });

  it("sub-items in flyout are clickable", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const handleClick = vi.fn();
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Products">
        <NavSubItem label="All Products" onClick={handleClick} />
      </NavItem>,
    );
    await user.hover(screen.getByTestId("nav-item-wrapper"));
    await user.hover(screen.getByTestId("nav-flyout"));
    await user.click(screen.getByText("All Products"));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("does NOT show flyout for items without children", () => {
    render(
      <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" />,
    );
    expect(screen.queryByTestId("nav-item-wrapper")).toBeNull();
    expect(screen.getByTestId("nav-item")).toBeDefined();
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

describe("NavSectionTitle", () => {
  it("renders section title text", () => {
    render(<NavSectionTitle>MAIN</NavSectionTitle>);
    expect(screen.getByText("MAIN")).toBeDefined();
  });

  it("is always hidden via opacity (always collapsed)", () => {
    render(<NavSectionTitle>MAIN</NavSectionTitle>);
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

  it("has reduced width (always collapsed)", () => {
    render(<NavDivider />);
    const divider = screen.getByTestId("nav-divider");
    expect(divider.className).toContain("w-8");
  });
});

describe("SidebarFooter", () => {
  it("renders avatar initials", () => {
    render(<SidebarFooter initials="JD" name="John Doe" role="Admin" />);
    expect(screen.getByText("JD")).toBeDefined();
  });

  it("hides name and role (always collapsed)", () => {
    render(<SidebarFooter initials="JD" name="John Doe" role="Admin" />);
    const name = screen.getByText("John Doe");
    expect(name.parentElement?.className).toContain("opacity-0");
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
