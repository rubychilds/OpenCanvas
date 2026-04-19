import { SemanticInspector } from "./inspector/SemanticInspector.js";

/**
 * Per the Penpot delta (ADR-0003): right panel is the Inspector, end of story.
 * No tabs. Prototype / Code / Traits were all removed — Traits is always
 * empty in practice for our GrapesJS component types; Prototype and Code are
 * v0.3+ scope.
 */
export function RightPanel() {
  return (
    <aside className="flex flex-col h-full bg-background border-l border-border overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto">
        <SemanticInspector />
      </div>
    </aside>
  );
}
