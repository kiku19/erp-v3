import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full py-1 px-3 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-border text-foreground",
        success: "bg-success-bg text-success-foreground",
        error: "bg-error-bg text-error-foreground",
        warning: "bg-warning-bg text-warning-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeVariantProps = VariantProps<typeof badgeVariants>;

interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    BadgeVariantProps {}

const Badge = ({ className, variant, children, ...props }: BadgeProps) => {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {children}
    </span>
  );
};

export { Badge, badgeVariants, type BadgeProps };
