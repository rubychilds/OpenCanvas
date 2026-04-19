import { useEffect, useState } from "react";
import { useEditorMaybe } from "@grapesjs/react";
import type { Component } from "grapesjs";
import { LeftPanel } from "./LeftPanel.js";
import { RightPanel } from "./RightPanel.js";
import { CanvasArea } from "./CanvasArea.js";

/**
 * Shell layout per ADR-0003 / user direction: fixed-width side panels, no
 * user-resize drag gutters (Figma/Penpot don't expose those prominently
 * either). The right panel is mounted only when a component is selected —
 * the canvas takes the full width when nothing is selected, so the empty
 * state feels open rather than cluttered with an "empty inspector" prompt.
 */
export function Shell() {
  const editor = useEditorMaybe();
  const [hasSelection, setHasSelection] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const update = () => setHasSelection(Boolean(editor.getSelected()));
    update();
    editor.on("component:selected component:deselected", update);
    return () => {
      editor.off("component:selected component:deselected", update);
    };
  }, [editor]);

  return (
    <div className="flex-1 min-h-0 flex">
      <div id="oc-left" className="w-60 shrink-0 min-w-0">
        <LeftPanel />
      </div>
      <div id="oc-center" className="flex-1 min-w-0">
        <CanvasArea />
      </div>
      {hasSelection ? (
        <div id="oc-right" className="w-72 shrink-0 min-w-0">
          <RightPanel />
        </div>
      ) : null}
    </div>
  );
}
