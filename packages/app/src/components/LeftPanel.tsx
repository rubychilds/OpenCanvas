import { LayersPanel } from "./LayersPanel.js";

/**
 * Per the Penpot delta (ADR-0003): one view, not tabs. Layers owns the whole
 * left panel, with a collapsible Frames section at the top and the recursive
 * layer tree beneath. Previous Blocks / Artboards / Traits tabs retired —
 * block creation is the InsertRail's job now; frame rename/delete moves into
 * the Frames section inline.
 */
export function LeftPanel() {
  return (
    <div className="flex flex-col h-full bg-background border-r border-border overflow-hidden">
      <LayersPanel />
    </div>
  );
}
