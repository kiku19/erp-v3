"use client";

import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

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
  children?: ReactNode;
}

interface NavSubItemProps {
  label: string;
  active?: boolean;
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
        "flex items-center gap-2.5 p-5 overflow-hidden",
        className,
      )}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center">
        {logo ?? (
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <span className="text-sm font-bold text-primary-foreground">E</span>
          </div>
        )}
      </div>
      <span
        className={cn(
          "text-base font-bold text-foreground whitespace-nowrap transition-[max-width,opacity] duration-[var(--duration-slow)] ease-[var(--ease-default)] overflow-hidden",
          collapsed ? "max-w-0 opacity-0" : "max-w-[180px] opacity-100",
        )}
      >
        {brand}
      </span>
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
      <div
        className={cn(
          "flex flex-col overflow-hidden transition-[opacity] duration-[var(--duration-slow)] ease-[var(--ease-default)]",
          collapsed ? "opacity-0" : "opacity-100",
        )}
      >
        <span className="truncate text-[13px] font-medium text-foreground">
          {name}
        </span>
        <span className="truncate text-xs text-muted-foreground">{role}</span>
      </div>
    </div>
  );
}

function NavSubItem({
  label,
  active = false,
  onClick,
  href,
  className,
}: NavSubItemProps) {
  const classes = cn(
    "flex items-center rounded-[var(--radius-sm)] px-3 py-1.5 text-sm cursor-pointer transition-colors duration-[var(--duration-fast)] ease-[var(--ease-default)]",
    active
      ? "bg-primary-active font-medium text-primary-active-foreground"
      : "text-foreground hover:bg-muted-hover",
    className,
  );

  if (href) {
    return (
      <a
        data-testid="nav-sub-item"
        href={href}
        className={classes}
        onClick={onClick}
      >
        {label}
      </a>
    );
  }

  return (
    <div
      data-testid="nav-sub-item"
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
      {label}
    </div>
  );
}

function useFlyoutPosition(
  wrapperRef: React.RefObject<HTMLDivElement | null>,
  visible: boolean,
) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!visible || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setPos({
      top: rect.top,
      left: rect.right + 6,
    });
  }, [visible, wrapperRef]);

  useEffect(() => {
    updatePosition();
  }, [updatePosition]);

  return pos;
}

function NavItem({
  icon,
  label,
  active = false,
  collapsed = false,
  onClick,
  href,
  className,
  children,
}: NavItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [flyoutVisible, setFlyoutVisible] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasChildren = !!children;

  const flyoutPos = useFlyoutPosition(wrapperRef, flyoutVisible);

  const showFlyout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setFlyoutVisible(true);
  }, []);

  const hideFlyout = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setFlyoutVisible(false);
      hideTimeoutRef.current = null;
    }, 100);
  }, []);

  useEffect(() => {
    if (collapsed) {
      setExpanded(false);
    }
  }, [collapsed]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const classes = cn(
    "flex items-center gap-2.5 rounded-md px-3 py-2 overflow-hidden transition-all duration-[var(--duration-normal)] ease-[var(--ease-default)] cursor-pointer",
    active
      ? "bg-primary-active text-primary-active-foreground"
      : "text-muted-foreground hover:bg-muted-hover",
    className,
  );

  const handleItemClick = () => {
    if (hasChildren && !collapsed) {
      setExpanded((prev) => !prev);
    }
    onClick?.();
  };

  const itemContent = (
    <>
      <span className={cn("shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]", active ? "text-primary-active-foreground" : "text-muted-foreground")}>
        {icon}
      </span>
      <span
        className={cn(
          "flex-1 text-sm whitespace-nowrap transition-[opacity] duration-[var(--duration-slow)] ease-[var(--ease-default)]",
          active ? "font-medium text-primary-active-foreground" : "text-foreground",
          collapsed ? "opacity-0" : "opacity-100",
        )}
      >
        {label}
      </span>
      {hasChildren && !collapsed && (
        <ChevronRight
          data-testid="nav-item-chevron"
          size={14}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-[var(--duration-normal)] ease-[var(--ease-default)]",
            expanded && "rotate-90",
          )}
        />
      )}
    </>
  );

  const flyout = flyoutVisible && typeof document !== "undefined"
    ? createPortal(
        <div
          data-testid="nav-flyout"
          className="fixed z-50 min-w-[180px] rounded-md border border-border bg-background p-1 shadow-[var(--shadow-dropdown)] animate-flyout-in"
          style={{ top: flyoutPos.top, left: flyoutPos.left }}
          onMouseEnter={showFlyout}
          onMouseLeave={hideFlyout}
        >
          <div
            data-testid="nav-flyout-header"
            className="px-3 py-1.5 text-sm font-medium text-foreground"
          >
            {label}
          </div>
          {hasChildren && (
            <>
              <div className="my-1 h-px bg-border" />
              {children}
            </>
          )}
        </div>,
        document.body,
      )
    : null;

  const itemElement = href && !hasChildren ? (
    <a
      data-testid="nav-item"
      href={href}
      className={classes}
      onClick={onClick}
      aria-label={collapsed ? label : undefined}
    >
      {itemContent}
    </a>
  ) : (
    <div
      data-testid="nav-item"
      role="button"
      tabIndex={0}
      className={classes}
      aria-label={collapsed ? label : undefined}
      onClick={handleItemClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleItemClick();
        }
      }}
    >
      {itemContent}
    </div>
  );

  // Collapsed mode with children: wrap with hover-triggered flyout via portal
  if (collapsed && hasChildren) {
    return (
      <div
        data-testid="nav-item-wrapper"
        className="relative"
        ref={wrapperRef}
        onMouseEnter={showFlyout}
        onMouseLeave={hideFlyout}
      >
        {itemElement}
        {flyout}
      </div>
    );
  }

  // Expanded mode with children: render item + animated inline sub-items
  if (hasChildren) {
    return (
      <div data-testid="nav-item-wrapper">
        {itemElement}
        <div
          data-testid="nav-sub-items"
          className={cn(
            "grid transition-[grid-template-rows] duration-[var(--duration-slow)] ease-[var(--ease-default)]",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div data-testid="nav-sub-items-inner" className="overflow-hidden">
            <div className="ml-[30px] mt-0.5 flex flex-col gap-0.5 py-0.5">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Simple item without children (both collapsed and expanded)
  return itemElement;
}

function NavSectionTitle({
  children,
  collapsed = false,
  className,
}: NavSectionTitleProps) {
  return (
    <div
      className={cn(
        "overflow-hidden px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground whitespace-nowrap transition-[opacity] duration-[var(--duration-slow)] ease-[var(--ease-default)]",
        collapsed ? "opacity-0" : "opacity-100",
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
  NavSubItem,
  NavSectionTitle,
  NavDivider,
  type SidebarProps,
  type SidebarHeaderProps,
  type SidebarNavProps,
  type SidebarFooterProps,
  type NavItemProps,
  type NavSubItemProps,
  type NavSectionTitleProps,
  type NavDividerProps,
};
