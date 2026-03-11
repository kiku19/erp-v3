"use client";

import { useState, useCallback, useId } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

function Checkbox({
  checked: controlledChecked,
  defaultChecked = false,
  onChange,
  label,
  disabled = false,
  className,
  id,
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const isControlled = controlledChecked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isChecked = isControlled ? controlledChecked : internalChecked;

  const handleChange = useCallback(() => {
    if (disabled) return;
    const next = !isChecked;
    if (!isControlled) {
      setInternalChecked(next);
    }
    onChange?.(next);
  }, [disabled, isChecked, isControlled, onChange]);

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 select-none",
        disabled && "cursor-not-allowed opacity-50",
        !disabled && "cursor-pointer",
        className,
      )}
      htmlFor={inputId}
    >
      <span className="relative inline-flex items-center justify-center">
        <input
          type="checkbox"
          id={inputId}
          checked={isChecked}
          disabled={disabled}
          onChange={handleChange}
          className="sr-only peer"
          aria-label={label}
        />
        <span
          className={cn(
            "flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border-[1.5px] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-default)]",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "active:scale-[var(--scale-press)]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
            isChecked
              ? "border-primary bg-primary"
              : "border-border bg-background",
          )}
          aria-hidden="true"
        >
          {isChecked && (
            <Check
              size={12}
              className="text-primary-foreground animate-in zoom-in-0 duration-[var(--duration-fast)]"
              strokeWidth={3}
            />
          )}
        </span>
      </span>
      {label && (
        <span className="text-sm font-normal text-foreground">{label}</span>
      )}
    </label>
  );
}

export { Checkbox, type CheckboxProps };
