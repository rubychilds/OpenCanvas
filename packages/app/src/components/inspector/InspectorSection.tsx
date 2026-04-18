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
      <header className="flex items-center justify-between h-(--section-title-height) px-(--panel-padding)">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action}
      </header>
      <div className="flex flex-col gap-1 px-(--panel-padding) pb-2">{children}</div>
    </section>
  );
}
