import { forwardRef, type ButtonHTMLAttributes, type ReactElement } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-[var(--duration-normal)] ease-[var(--ease-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[var(--scale-press)]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        outline:
          "border border-border bg-background text-foreground hover:bg-muted-hover",
        ghost:
          "text-foreground hover:bg-muted-hover",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive-hover",
        icon:
          "border border-border bg-background text-foreground hover:bg-muted-hover",
      },
      size: {
        default: "h-10 px-5 py-2.5 text-sm",
        sm: "h-8 px-3 py-1.5 text-sm",
        lg: "h-12 px-8 py-3 text-base",
        icon: "h-9 w-9 p-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    if (asChild) {
      const child = children as ReactElement<
        Record<string, unknown> & { className?: string }
      >;
      if (!child || typeof child !== "object") {
        return null;
      }

      const { props: childProps, type: ChildType } = child as ReactElement<
        Record<string, unknown> & { className?: string }
      >;

      return (
        <ChildType
          {...childProps}
          className={cn(buttonVariants({ variant, size }), className, childProps.className)}
        />
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants, type ButtonProps };
