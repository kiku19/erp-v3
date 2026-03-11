"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
  type KeyboardEvent,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}

interface DropdownMenuItemProps {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}

interface DropdownMenuDividerProps {
  className?: string;
}

const DropdownContext = createContext<{ close: () => void }>({
  close: () => {},
});

function DropdownMenu({
  trigger,
  children,
  align = "start",
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const close = useCallback(() => setOpen(false), []);

  // Handle mount/unmount with animation
  useEffect(() => {
    if (open) {
      setIsClosing(false);
      setIsMounted(true);
    } else if (isMounted) {
      setIsClosing(true);
    }
  }, [open, isMounted]);

  // Fallback: unmount after exit duration if onAnimationEnd doesn't fire (e.g. jsdom)
  useEffect(() => {
    if (!isClosing) return;
    const timer = setTimeout(() => {
      setIsMounted(false);
      setIsClosing(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [isClosing]);

  const handleAnimationEnd = useCallback(() => {
    if (isClosing) {
      setIsMounted(false);
      setIsClosing(false);
    }
  }, [isClosing]);

  // Calculate position when menu opens
  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const style: CSSProperties = {
      position: "fixed",
      top: rect.bottom + 4,
      zIndex: 9999,
    };

    if (align === "end") {
      style.right = window.innerWidth - rect.right;
    } else {
      style.left = rect.left;
    }

    setMenuStyle(style);
  }, [open, align]);

  // Focus the menu when mounted (not closing) so keyboard events work
  useEffect(() => {
    if (isMounted && !isClosing && menuRef.current) {
      menuRef.current.focus();
    }
  }, [isMounted, isClosing]);

  // Close on outside click or escape
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        close();
      }
    }

    function handleEscape(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        close();
      }
    }

    // Close on scroll so the menu doesn't float detached from its trigger
    function handleScroll() {
      close();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, close]);

  const getMenuItems = () => {
    if (!menuRef.current) return [];
    return Array.from(
      menuRef.current.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      ),
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;

    const items = getMenuItems();
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      items[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      items[prev]?.focus();
    } else if (e.key === "Enter" && currentIndex >= 0) {
      e.preventDefault();
      items[currentIndex]?.click();
    }
  };

  const menu = isMounted ? (
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onAnimationEnd={handleAnimationEnd}
      style={{
        ...menuStyle,
        animation: isClosing
          ? "dropdown-out var(--duration-fast) var(--ease-default) forwards"
          : "dropdown-in var(--duration-normal) var(--ease-default) forwards",
        transformOrigin: align === "end" ? "top right" : "top left",
      }}
      className={cn(
        "w-[220px] rounded-md border border-border bg-background p-1 shadow-[var(--shadow-dropdown)] outline-none",
        className,
      )}
    >
      {children}
    </div>
  ) : null;

  return (
    <DropdownContext.Provider value={{ close }}>
      <div ref={triggerRef} className="inline-block">
        <div onClick={() => setOpen((prev) => !prev)}>{trigger}</div>
        {menu && createPortal(menu, document.body)}
      </div>
    </DropdownContext.Provider>
  );
}

function DropdownMenuItem({
  icon,
  children,
  onClick,
  active = false,
  disabled = false,
  className,
}: DropdownMenuItemProps) {
  const { close } = useContext(DropdownContext);

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    close();
  };

  return (
    <div
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={handleClick}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-[4px] px-3 py-2 text-sm outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-default)]",
        active
          ? "bg-primary-active font-medium text-primary-active-foreground"
          : "text-foreground hover:bg-muted-hover",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {icon && (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </div>
  );
}

function DropdownMenuDivider({ className }: DropdownMenuDividerProps) {
  return (
    <div
      role="separator"
      className={cn("my-1 h-px w-full bg-border", className)}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuDivider,
  type DropdownMenuProps,
  type DropdownMenuItemProps,
  type DropdownMenuDividerProps,
};
