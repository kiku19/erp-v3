import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayoutDashboard } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarNav,
  SidebarFooter,
  NavItem,
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

  it("hides brand text when collapsed", () => {
    render(<SidebarHeader brand="ERP System" collapsed />);
    expect(screen.getByText("E")).toBeDefined();
    const brand = screen.queryByText("ERP System");
    expect(brand).toBeNull();
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
    expect(item.className).toContain("bg-accent");
  });

  it("hides label when collapsed", () => {
    render(
      <NavItem
        icon={<LayoutDashboard size={18} />}
        label="Dashboard"
        collapsed
      />,
    );
    const label = screen.queryByText("Dashboard");
    expect(label).toBeNull();
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

  it("renders centered icon when collapsed (40x40)", () => {
    render(
      <NavItem
        icon={<LayoutDashboard size={18} />}
        label="Dashboard"
        collapsed
      />,
    );
    const item = screen.getByTestId("nav-item");
    expect(item.className).toContain("w-10");
    expect(item.className).toContain("h-10");
    expect(item.className).toContain("justify-center");
  });
});

describe("NavSectionTitle", () => {
  it("renders section title text", () => {
    render(<NavSectionTitle>MAIN</NavSectionTitle>);
    expect(screen.getByText("MAIN")).toBeDefined();
  });

  it("is hidden when collapsed", () => {
    render(<NavSectionTitle collapsed>MAIN</NavSectionTitle>);
    const title = screen.queryByText("MAIN");
    expect(title).toBeNull();
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

  it("hides name and role when collapsed", () => {
    render(<SidebarFooter initials="JD" name="John Doe" role="Admin" collapsed />);
    expect(screen.getByText("JD")).toBeDefined();
    expect(screen.queryByText("John Doe")).toBeNull();
    expect(screen.queryByText("Admin")).toBeNull();
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
