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
} from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Focus the menu when opened so keyboard events work
  useEffect(() => {
    if (open && menuRef.current) {
      menuRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }

    function handleEscape(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        close();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
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

  return (
    <DropdownContext.Provider value={{ close }}>
      <div ref={containerRef} className="relative inline-block">
        <div onClick={() => setOpen((prev) => !prev)}>{trigger}</div>
        {open && (
          <div
            ref={menuRef}
            role="menu"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className={cn(
              "absolute z-50 mt-1 w-[220px] rounded-md border border-border bg-background p-1 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.1)] outline-none",
              "transition-all duration-[var(--duration-normal)] ease-[var(--ease-default)]",
              align === "end" ? "right-0" : "left-0",
              className,
            )}
          >
            {children}
          </div>
        )}
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
          ? "bg-accent font-medium text-accent-foreground"
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
