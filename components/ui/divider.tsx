import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

const Divider = ({
  className,
  orientation = "horizontal",
  ...props
}: DividerProps) => {
  return (
    <div
      role="separator"
      aria-orientation={orientation === "vertical" ? "vertical" : undefined}
      className={cn(
        "bg-border",
        orientation === "horizontal" ? "w-full h-px" : "w-px h-full",
        className,
      )}
      {...props}
    />
  );
};

export { Divider, type DividerProps };
