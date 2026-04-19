import { type ReactNode } from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "../../canvas/chrome-icons.js";
import { cn } from "../../lib/utils.js";

export interface InspectorSectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /**
   * Make the section collapsible with a chevron next to the title. Open by
   * default unless `defaultOpen` is false. Used for sections whose body is
   * bulky or rarely consulted (e.g. Exports).
   */
  collapsible?: boolean;
  defaultOpen?: boolean;
}

/**
 * One fixed top-level section of the semantic inspector (per ADR-0002).
 * Header row is 20px tall (--section-title-height), matching the Accordion
 * triggers used for the Raw CSS fallback so the two feel cohesive.
 *
 * Not collapsible by default — Figma keeps these sections always open and uses
 * an inline toggle (the `action` slot) for opt-in sections like Auto-layout.
 */
export function InspectorSection({
  title,
  action,
  children,
  className,
  collapsible,
  defaultOpen = true,
}: InspectorSectionProps) {
  // Right padding is bigger than left — reserves a ~20px column on the right
  // for section-header `+` (or other) action icons. Input rows never stretch
  // into that column even when the section has no action, so the right edge
  // of controls stays vertically aligned across every section of the inspector.
  //
  // `empty:*` collapses the padding when the section body renders no children
  // (e.g. Fill with no layers, Effects collapsed, Auto Layout off). Without
  // this, a section with just a header + `+` action would carry ~20px of
  // empty space below it, visibly heavier than collapsed-sibling sections.
  const contentClass =
    "flex flex-col gap-2 pl-(--panel-padding) pr-8 pt-2 pb-3 empty:p-0";

  // Header row: title and action both 20px tall and items-center. Title uses
  // `leading-5` so its line-box matches the 20px action button, yielding a
  // clean vertical alignment without relying on flex-center + font-baseline
  // coincidence.
  const headerClass =
    "flex items-center justify-between h-8 px-(--panel-padding)";
  const titleClass =
    "text-[13px] font-semibold text-foreground leading-5";

  if (collapsible) {
    return (
      <AccordionPrimitive.Root
        type="single"
        collapsible
        defaultValue={defaultOpen ? title : undefined}
        className={cn("flex flex-col border-b border-border last:border-b-0", className)}
      >
        <AccordionPrimitive.Item value={title} className="border-b-0">
          <AccordionPrimitive.Header className={headerClass}>
            <AccordionPrimitive.Trigger
              className={cn(
                "group flex flex-1 items-center gap-1",
                titleClass,
                "focus-visible:outline-none",
              )}
            >
              <ChevronDown
                className="size-3 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=closed]:-rotate-90"
              />
              <span>{title}</span>
            </AccordionPrimitive.Trigger>
            {action}
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content
            className={cn(
              "overflow-hidden",
              "data-[state=closed]:animate-[accordion-up_150ms_ease-out]",
              "data-[state=open]:animate-[accordion-down_150ms_ease-out]",
            )}
          >
            <div className={contentClass}>{children}</div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      </AccordionPrimitive.Root>
    );
  }

  return (
    <section className={cn("flex flex-col border-b border-border last:border-b-0", className)}>
      <header className={headerClass}>
        <h3 className={titleClass}>{title}</h3>
        {action}
      </header>
      <div className={contentClass}>{children}</div>
    </section>
  );
}

/**
 * Small label sitting directly above its control. Penpot-shaped — the label
 * is 11px muted grey on its own line, not a 44px column to the left of the
 * control. Groups that don't need a label render their control directly.
 */
export function FieldGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[11px] text-muted-foreground leading-none">{label}</span>
      {children}
    </div>
  );
}
