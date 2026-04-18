import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const toggleGroupItemVariants = cva(
  "inline-flex items-center justify-center text-foreground transition-colors " +
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring " +
    "disabled:pointer-events-none disabled:opacity-50 " +
    "data-[state=on]:bg-oc-accent data-[state=on]:text-oc-accent-foreground " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-border first:rounded-l-md last:rounded-r-md -ml-px first:ml-0 hover:bg-surface-sunken",
        ghost: "rounded-sm hover:bg-surface-sunken",
      },
      size: {
        sm: "h-6 w-6 [&_svg]:size-3.5",
        md: "h-7 w-7 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

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
    className={cn("inline-flex", className)}
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
