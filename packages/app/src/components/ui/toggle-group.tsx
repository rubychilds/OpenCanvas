import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const toggleGroupItemVariants = cva(
  // Penpot-shape segmented-toggle item: transparent by default, white-on-select,
  // 1px radius, no border. Lives inside a grey-chip container with 1px padding
  // (see the ToggleGroup root below).
  //
  // Icon stroke is grey at rest and flips to foreground (black) on hover or
  // when selected — per user direction that icons "should be grey and not
  // black. only when an icon is selected/active, or hovered on it should be
  // black."
  //
  // Selection uses `aria-checked` rather than `data-state` because we wrap
  // each item in a Radix `<TooltipTrigger asChild>`, and the tooltip's
  // data-state (open/closed) overwrites the ToggleGroup's data-state on the
  // shared button. `aria-checked` is set by Radix ToggleGroupItem directly
  // on the DOM node and survives the asChild merge.
  "inline-flex items-center justify-center text-muted-foreground transition-colors " +
    "rounded-[1px] " +
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring " +
    "disabled:pointer-events-none disabled:opacity-50 " +
    "hover:text-foreground " +
    "aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-sm " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-background",
        ghost: "rounded-sm hover:bg-background",
      },
      size: {
        // Items sit inside a chip whose outer height matches inspector
        // NumberInput / select chips (h-7 = 28px) — items are h-6 (24px)
        // with the root's 2px padding completing the 28px. Keeps toggles
        // and inputs on the same baseline grid so Typography / Layout
        // rows don't have two different row heights side-by-side.
        sm: "h-6 w-6 [&_svg]:size-4",
        md: "h-6 w-6 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

// `w-fit` prevents the ToggleGroup from stretching to fill a flex-column
// parent. Without it, `inline-flex` still expands because flex-column parents
// default to `align-items: stretch`.
const toggleGroupRootVariants = cva("inline-flex w-fit", {
  variants: {
    variant: {
      // Grey-chip container holding transparent/white-on-select items.
      // Padding is 2px so (root padding 4px + item height 24px) adds up
      // to the 28px input-chip height used elsewhere in the inspector.
      default: "bg-chip p-0.5 rounded-md gap-px",
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
