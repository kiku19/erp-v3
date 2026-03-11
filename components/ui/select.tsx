import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const Select = ({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className,
}: SelectProps) => {
  const [internalValue, setInternalValue] = useState<string | undefined>(
    defaultValue,
  );
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;
  const selectedOption = options.find((opt) => opt.value === currentValue);

  const handleSelect = useCallback(
    (optionValue: string) => {
      if (!isControlled) {
        setInternalValue(optionValue);
      }
      onChange?.(optionValue);
      setIsOpen(false);
    },
    [isControlled, onChange],
  );

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
      if (e.key === "Enter" || e.key === " ") {
        if (!isOpen) {
          e.preventDefault();
          setIsOpen(true);
        }
      }
    },
    [isOpen],
  );

  const handleOptionKeyDown = useCallback(
    (e: React.KeyboardEvent, optionValue: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect(optionValue);
      }
    },
    [handleSelect],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex w-full items-center justify-between bg-background rounded-md border border-input py-2.5 px-3.5 text-sm transition-all duration-[var(--duration-normal)] ease-[var(--ease-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span
          className={cn(
            !selectedOption && "text-muted-foreground",
            selectedOption && "text-foreground",
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "text-muted-foreground transition-transform duration-[var(--duration-normal)] ease-[var(--ease-default)]",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border border-input bg-background shadow-lg"
        >
          {options.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === currentValue}
              tabIndex={0}
              onClick={() => handleSelect(option.value)}
              onKeyDown={(e) => handleOptionKeyDown(e, option.value)}
              className={cn(
                "cursor-pointer px-3.5 py-2.5 text-sm text-foreground transition-colors duration-[var(--duration-normal)] ease-[var(--ease-default)] hover:bg-muted-hover first:rounded-t-md last:rounded-b-md",
                option.value === currentValue && "bg-muted-hover",
              )}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

Select.displayName = "Select";

export { Select, type SelectProps, type SelectOption };
