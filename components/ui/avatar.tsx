import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold overflow-hidden",
  {
    variants: {
      size: {
        sm: "h-8 w-8 text-xs",
        default: "h-10 w-10 text-sm",
        lg: "h-14 w-14 text-xl",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

type AvatarVariantProps = VariantProps<typeof avatarVariants>;

interface AvatarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    AvatarVariantProps {
  initials: string;
  src?: string;
  alt?: string;
}

const Avatar = ({
  className,
  size,
  initials,
  src,
  alt,
  ...props
}: AvatarProps) => {
  return (
    <div
      className={cn(avatarVariants({ size }), className)}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? initials}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export { Avatar, avatarVariants, type AvatarProps };
