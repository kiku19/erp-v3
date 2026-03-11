import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  children: ReactNode;
  className?: string;
}

interface SidebarHeaderProps {
  logo?: ReactNode;
  brand?: string;
  collapsed?: boolean;
  className?: string;
}

interface SidebarNavProps {
  children: ReactNode;
  className?: string;
}

interface SidebarFooterProps {
  initials: string;
  name: string;
  role: string;
  collapsed?: boolean;
  className?: string;
}

interface NavItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
  href?: string;
  className?: string;
}

interface NavSectionTitleProps {
  children: ReactNode;
  collapsed?: boolean;
  className?: string;
}

interface NavDividerProps {
  collapsed?: boolean;
  className?: string;
}

function Sidebar({
  collapsed = false,
  onCollapsedChange,
  children,
  className,
}: SidebarProps) {
  return (
    <aside
      data-testid="sidebar"
      className={cn(
        "flex h-full flex-col bg-background border-r border-border transition-all duration-[var(--duration-slow)] ease-[var(--ease-default)] overflow-hidden",
        collapsed ? "w-16" : "w-[260px]",
        className,
      )}
    >
      {children}
    </aside>
  );
}

function SidebarHeader({
  logo,
  brand = "ERP System",
  collapsed = false,
  className,
}: SidebarHeaderProps) {
  return (
    <div
      data-testid="sidebar-header"
      className={cn(
        "flex items-center gap-2.5 p-5",
        className,
      )}
    >
      {logo ?? (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
          <span className="text-sm font-bold text-primary-foreground">E</span>
        </div>
      )}
      {!collapsed && (
        <span className="text-base font-bold text-foreground whitespace-nowrap">
          {brand}
        </span>
      )}
    </div>
  );
}

function SidebarNav({ children, className }: SidebarNavProps) {
  return (
    <nav
      className={cn(
        "flex flex-1 flex-col gap-0.5 px-3 py-2",
        className,
      )}
    >
      {children}
    </nav>
  );
}

function SidebarFooter({
  initials,
  name,
  role,
  collapsed = false,
  className,
}: SidebarFooterProps) {
  return (
    <div
      data-testid="sidebar-footer"
      className={cn(
        "flex items-center gap-2.5 border-t border-border px-5 py-4",
        className,
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <span className="text-xs font-medium text-muted-foreground">
          {initials}
        </span>
      </div>
      {!collapsed && (
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-[13px] font-medium text-foreground">
            {name}
          </span>
          <span className="truncate text-xs text-muted-foreground">{role}</span>
        </div>
      )}
    </div>
  );
}

function NavItem({
  icon,
  label,
  active = false,
  collapsed = false,
  onClick,
  href,
  className,
}: NavItemProps) {
  const classes = cn(
    "flex items-center gap-2.5 rounded-md transition-all duration-[var(--duration-normal)] ease-[var(--ease-default)] cursor-pointer",
    collapsed
      ? "h-10 w-10 justify-center p-0"
      : "px-3 py-2",
    active
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:bg-muted-hover",
    className,
  );

  const content = (
    <>
      <span className={cn("shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]", active ? "text-accent-foreground" : "text-muted-foreground")}>
        {icon}
      </span>
      {!collapsed && (
        <span
          className={cn(
            "text-sm whitespace-nowrap",
            active ? "font-medium text-accent-foreground" : "text-foreground",
          )}
        >
          {label}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <a
        data-testid="nav-item"
        href={href}
        className={classes}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      data-testid="nav-item"
      role="button"
      tabIndex={0}
      className={classes}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.();
        }
      }}
    >
      {content}
    </div>
  );
}

function NavSectionTitle({
  children,
  collapsed = false,
  className,
}: NavSectionTitleProps) {
  if (collapsed) return null;

  return (
    <div
      className={cn(
        "px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

function NavDivider({ collapsed = false, className }: NavDividerProps) {
  return (
    <div
      data-testid="nav-divider"
      className={cn(
        "my-2 h-px bg-border",
        collapsed ? "mx-auto w-8" : "w-full",
        className,
      )}
    />
  );
}

export {
  Sidebar,
  SidebarHeader,
  SidebarNav,
  SidebarFooter,
  NavItem,
  NavSectionTitle,
  NavDivider,
  type SidebarProps,
  type SidebarHeaderProps,
  type SidebarNavProps,
  type SidebarFooterProps,
  type NavItemProps,
  type NavSectionTitleProps,
  type NavDividerProps,
};
