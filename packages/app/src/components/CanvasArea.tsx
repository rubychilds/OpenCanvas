import { useEffect, useState } from "react";
import { Canvas, useEditorMaybe } from "@grapesjs/react";
import { Maximize2 } from "lucide-react";
import { Button } from "./ui/button.js";
import { ArtboardToolbar } from "./ArtboardToolbar.js";
import { ArtboardBootstrap } from "./ArtboardBootstrap.js";
import { PanZoomWire } from "./PanZoomWire.js";

export function CanvasArea() {
  const editor = useEditorMaybe();
  const [zoom, setZoomState] = useState<number>(100);

  useEffect(() => {
    if (!editor) return;
    const update = () => setZoomState(Math.round(editor.Canvas.getZoom()));
    update();
    editor.on("canvas:zoom", update);
    return () => {
      editor.off("canvas:zoom", update);
    };
  }, [editor]);

  const fit = () => editor?.runCommand("core:canvas-fit");
  const setZoom = (z: number) => editor?.Canvas.setZoom(z);

  return (
    <div className="flex flex-col h-full bg-canvas">
      <div className="flex items-center gap-2 px-3 h-9 border-b border-border bg-surface">
        <ArtboardToolbar />

        <div className="h-4 w-px bg-border mx-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={fit}
          data-testid="oc-zoom-fit"
          title="Fit (⌘0)"
        >
          <Maximize2 />
          Fit
        </Button>
        <Button variant="outline" size="sm" onClick={() => setZoom(50)} data-testid="oc-zoom-50">
          50%
        </Button>
        <Button variant="outline" size="sm" onClick={() => setZoom(100)} data-testid="oc-zoom-100">
          100%
        </Button>
        <Button variant="outline" size="sm" onClick={() => setZoom(200)} data-testid="oc-zoom-200">
          200%
        </Button>

        <span
          className="ml-auto text-xs text-muted-foreground tabular-nums"
          data-testid="oc-zoom-indicator"
        >
          {zoom}%
        </span>
      </div>
      <Canvas className="flex-1 min-h-0 relative" />
      <ArtboardBootstrap />
      <PanZoomWire />
    </div>
  );
}
