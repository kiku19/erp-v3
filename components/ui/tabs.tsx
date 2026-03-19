"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

/* ─────────────────────── Context ──────────────────────────────────── */

interface TabsContextValue {
  activeValue: string;
  setActiveValue: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs compound components must be used within <Tabs>");
  return ctx;
}

/* ─────────────────────── Tabs (root) ──────────────────────────────── */

interface TabsProps {
  children: ReactNode;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

function Tabs({ children, defaultValue, value, onChange, className }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const isControlled = value !== undefined;
  const activeValue = isControlled ? value : internalValue;

  const setActiveValue = useCallback(
    (v: string) => {
      if (!isControlled) setInternalValue(v);
      onChange?.(v);
    },
    [isControlled, onChange],
  );

  return (
    <TabsContext.Provider value={{ activeValue, setActiveValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

/* ─────────────────────── TabList ──────────────────────────────────── */

interface TabListProps {
  children: ReactNode;
  className?: string;
}

function TabList({ children, className }: TabListProps) {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-0 border-b border-border ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/* ─────────────────────── Tab ─────────────────────────────────────── */

interface TabProps {
  children: ReactNode;
  value: string;
  className?: string;
  disabled?: boolean;
}

function Tab({ children, value, className, disabled }: TabProps) {
  const { activeValue, setActiveValue } = useTabsContext();
  const isActive = activeValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => !disabled && setActiveValue(value)}
      className={`flex items-center justify-center px-4 py-2.5 text-[13px] transition-colors duration-[var(--duration-fast)] ${
        disabled
          ? "text-muted-foreground/50 cursor-not-allowed"
          : isActive
            ? "font-semibold text-foreground border-b-2 border-foreground cursor-pointer"
            : "text-muted-foreground hover:text-foreground cursor-pointer"
      } ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

/* ─────────────────────── TabPanels ───────────────────────────────── */

interface TabPanelsProps {
  children: ReactNode;
  className?: string;
}

function TabPanels({ children, className }: TabPanelsProps) {
  return <div className={className}>{children}</div>;
}

/* ─────────────────────── TabPanel ────────────────────────────────── */

interface TabPanelProps {
  children: ReactNode;
  value: string;
  className?: string;
}

function TabPanel({ children, value, className }: TabPanelProps) {
  const { activeValue } = useTabsContext();
  if (activeValue !== value) return null;

  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}

/* ─────────────────────── Exports ─────────────────────────────────── */

export {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  type TabsProps,
  type TabListProps,
  type TabProps,
  type TabPanelsProps,
  type TabPanelProps,
};
