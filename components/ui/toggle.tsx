"use client";

import { useState, useCallback, useId, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

function Toggle({
  checked: controlledChecked,
  defaultChecked = false,
  onChange,
  label,
  disabled = false,
  className,
  id,
}: ToggleProps) {
  const generatedId = useId();
  const toggleId = id ?? generatedId;
  const isControlled = controlledChecked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isChecked = isControlled ? controlledChecked : internalChecked;

  const handleToggle = useCallback(() => {
    if (disabled) return;
    const next = !isChecked;
    if (!isControlled) {
      setInternalChecked(next);
    }
    onChange?.(next);
  }, [disabled, isChecked, isControlled, onChange]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle],
  );

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 select-none",
        disabled && "cursor-not-allowed opacity-50",
        !disabled && "cursor-pointer",
        className,
      )}
    >
      <div
        id={toggleId}
        role="switch"
        tabIndex={disabled ? -1 : 0}
        aria-checked={isChecked}
        aria-disabled={disabled || undefined}
        aria-label={label}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full p-[3px] transition-colors duration-[var(--duration-normal)] ease-[var(--ease-default)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "active:scale-[var(--scale-press)]",
          isChecked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "inline-block h-[18px] w-[18px] rounded-full transition-transform duration-[var(--duration-normal)] ease-[var(--ease-default)]",
            isChecked
              ? "translate-x-[20px] bg-primary-foreground"
              : "translate-x-0 bg-background",
          )}
          aria-hidden="true"
        />
      </div>
      {label && (
        <span className="text-sm font-normal text-foreground">{label}</span>
      )}
    </label>
  );
}

export { Toggle, type ToggleProps };
