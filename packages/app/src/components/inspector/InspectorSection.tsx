import { type ReactNode } from "react";
import { cn } from "../../lib/utils.js";

export interface InspectorSectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * One fixed top-level section of the semantic inspector (per ADR-0002).
 * Header row is 20px tall (--section-title-height), matching the Accordion
 * triggers used for the Raw CSS fallback so the two feel cohesive.
 *
 * Not collapsible by default — Figma keeps these sections always open and uses
 * an inline toggle (the `action` slot) for opt-in sections like Auto-layout.
 */
export function InspectorSection({ title, action, children, className }: InspectorSectionProps) {
  return (
    <section className={cn("flex flex-col border-b border-border last:border-b-0", className)}>
      <header className="flex items-center justify-between h-7 px-(--panel-padding) pt-1">
        <h3 className="text-[13px] font-semibold text-foreground leading-none">{title}</h3>
        {action}
      </header>
      <div className="flex flex-col gap-2 px-(--panel-padding) pt-1 pb-2.5">{children}</div>
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
