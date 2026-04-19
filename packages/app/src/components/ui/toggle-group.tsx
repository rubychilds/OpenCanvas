import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const toggleGroupItemVariants = cva(
  // Penpot-shape segmented-toggle item: transparent by default, white-on-select,
  // 1px radius, no border. Lives inside a grey-chip container with 2px padding
  // (see the ToggleGroup root below).
  "inline-flex items-center justify-center text-foreground transition-colors " +
    "rounded-[1px] " +
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring " +
    "disabled:pointer-events-none disabled:opacity-50 " +
    "data-[state=on]:bg-background data-[state=on]:shadow-sm " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-background/60",
        ghost: "rounded-sm hover:bg-surface-sunken",
      },
      size: {
        sm: "h-5 w-5 [&_svg]:size-3.5",
        md: "h-6 w-6 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

const toggleGroupRootVariants = cva("inline-flex", {
  variants: {
    variant: {
      // Grey-chip container holding transparent/white-on-select items.
      // Padding is 1px so the group hugs its content tightly (Penpot-shape).
      default: "bg-chip p-px rounded-md gap-px",
      // No container — single buttons that happen to live in a ToggleGroup.
      ghost: "",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type ToggleGroupVariantProps = VariantProps<typeof toggleGroupItemVariants>;

const ToggleGroupContext = React.createContext<ToggleGroupVariantProps>({
  variant: "default",
  size: "sm",
});

export const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> & ToggleGroupVariantProps
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn(toggleGroupRootVariants({ variant }), className)}
    {...props}
  >
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
));
ToggleGroup.displayName = "ToggleGroup";

export const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> & ToggleGroupVariantProps
>(({ className, variant, size, ...props }, ref) => {
  const ctx = React.useContext(ToggleGroupContext);
  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleGroupItemVariants({ variant: variant ?? ctx.variant, size: size ?? ctx.size }),
        className,
      )}
      {...props}
    />
  );
});
ToggleGroupItem.displayName = "ToggleGroupItem";
