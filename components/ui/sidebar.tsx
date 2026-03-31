"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

/* ─────────────────────────── Interfaces ─────────────────────────── */

interface SidebarProps {
  visible?: boolean;
  isClosing?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: ReactNode;
  className?: string;
}

interface SidebarHeaderProps {
  logo?: ReactNode;
  brand?: string;
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
  className?: string;
}

interface NavItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
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
  className?: string;
}

interface NavDividerProps {
  className?: string;
}

interface SidebarTriggerProps {
  onReveal: () => void;
  className?: string;
}

/* ─────────────────────────── Auto-hide hook ─────────────────────── */

function useSidebarAutoHide(autoHideDelay = 1000) {
  const [visible, setVisible] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const show = useCallback(() => {
    cancelHideTimer();
    if (animTimerRef.current) {
      clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
    setIsClosing(false);
    setVisible(true);
  }, [cancelHideTimer]);

  const hide = useCallback(() => {
    cancelHideTimer();
    setIsClosing(true);
    // After animation completes (300ms), unmount
    animTimerRef.current = setTimeout(() => {
      setVisible(false);
      setIsClosing(false);
      animTimerRef.current = null;
    }, 300);
  }, [cancelHideTimer]);

  const startHideTimer = useCallback(() => {
    cancelHideTimer();
    hideTimerRef.current = setTimeout(() => {
      hide();
      hideTimerRef.current = null;
    }, autoHideDelay);
  }, [autoHideDelay, hide, cancelHideTimer]);

  // Auto-start hide timer on mount so sidebar dismisses automatically
  useEffect(() => {
    hideTimerRef.current = setTimeout(() => {
      hide();
      hideTimerRef.current = null;
    }, autoHideDelay);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { visible, isClosing, show, hide, startHideTimer, cancelHideTimer };
}

/* ─────────────────────────── Sidebar ────────────────────────────── */

function Sidebar({
  visible = false,
  isClosing = false,
  onMouseEnter,
  onMouseLeave,
  children,
  className,
}: SidebarProps) {
  if (!visible && !isClosing) return null;

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        "fixed top-0 left-0 bottom-0 z-40 flex w-16 flex-col bg-background border-r border-border overflow-hidden",
        visible && !isClosing && "animate-sidebar-in",
        isClosing && "animate-sidebar-out",
        className,
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </aside>
  );
}

/* ─────────────────────────── Trigger ────────────────────────────── */

function SidebarTrigger({ onReveal, className }: SidebarTriggerProps) {
  return (
    <div
      data-testid="sidebar-trigger"
      className={cn("fixed top-0 left-0 z-30 h-full w-5", className)}
      onMouseEnter={onReveal}
    />
  );
}

/* ─────────────────────────── Header ─────────────────────────────── */

function SidebarHeader({
  logo,
  brand = "ERP System",
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
        className="max-w-0 opacity-0 text-base font-bold text-foreground whitespace-nowrap transition-[max-width,opacity] duration-[var(--duration-slow)] ease-[var(--ease-default)] overflow-hidden"
      >
        {brand}
      </span>
    </div>
  );
}

/* ─────────────────────────── Nav ────────────────────────────────── */

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

/* ─────────────────────────── Footer ─────────────────────────────── */

function SidebarFooter({
  initials,
  name,
  role,
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
      <div className="flex flex-col overflow-hidden opacity-0 transition-[opacity] duration-[var(--duration-slow)] ease-[var(--ease-default)]">
        <span className="truncate text-[13px] font-medium text-foreground">
          {name}
        </span>
        <span className="truncate text-xs text-muted-foreground">{role}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────── NavSubItem ──────────────────────────── */

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

/* ─────────────────────────── Flyout position ────────────────────── */

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

/* ─────────────────────────── NavItem ─────────────────────────────── */

function NavItem({
  icon,
  label,
  active = false,
  onClick,
  href,
  className,
  children,
}: NavItemProps) {
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

  const itemContent = (
    <>
      <span
        className={cn(
          "shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]",
          active ? "text-primary-active-foreground" : "text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="flex-1 text-sm whitespace-nowrap opacity-0 transition-[opacity] duration-[var(--duration-slow)] ease-[var(--ease-default)]">
        {label}
      </span>
    </>
  );

  const flyout =
    flyoutVisible && typeof document !== "undefined"
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

  const itemElement =
    href && !hasChildren ? (
      <a
        data-testid="nav-item"
        href={href}
        className={classes}
        onClick={onClick}
        aria-label={label}
      >
        {itemContent}
      </a>
    ) : (
      <div
        data-testid="nav-item"
        role="button"
        tabIndex={0}
        className={classes}
        aria-label={label}
        onClick={() => onClick?.()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onClick?.();
          }
        }}
      >
        {itemContent}
      </div>
    );

  // Items with children: wrap with hover-triggered flyout via portal
  if (hasChildren) {
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

  // Simple item without children
  return itemElement;
}

/* ─────────────────────────── NavSectionTitle ─────────────────────── */

function NavSectionTitle({
  children,
  className,
}: NavSectionTitleProps) {
  return (
    <div
      className={cn(
        "overflow-hidden px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground whitespace-nowrap opacity-0 transition-[opacity] duration-[var(--duration-slow)] ease-[var(--ease-default)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────── NavDivider ──────────────────────────── */

function NavDivider({ className }: NavDividerProps) {
  return (
    <div
      data-testid="nav-divider"
      className={cn(
        "my-2 h-px bg-border mx-auto w-8",
        className,
      )}
    />
  );
}

/* ─────────────────────────── Exports ─────────────────────────────── */

export {
  Sidebar,
  SidebarHeader,
  SidebarNav,
  SidebarFooter,
  SidebarTrigger,
  NavItem,
  NavSubItem,
  NavSectionTitle,
  NavDivider,
  useSidebarAutoHide,
  type SidebarProps,
  type SidebarHeaderProps,
  type SidebarNavProps,
  type SidebarFooterProps,
  type SidebarTriggerProps,
  type NavItemProps,
  type NavSubItemProps,
  type NavSectionTitleProps,
  type NavDividerProps,
};
