import { Canvas, useEditorMaybe } from "@grapesjs/react";
import { Maximize2 } from "lucide-react";
import { Button } from "./ui/button.js";

const ZOOM_PRESETS = [50, 100, 200] as const;

export function CanvasArea() {
  const editor = useEditorMaybe();
  const setZoom = (z: number) => editor?.Canvas.setZoom(z);
  const fit = () => editor?.runCommand("core:canvas-fit");

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-1.5 px-3 h-8 border-b border-border bg-surface">
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
        {ZOOM_PRESETS.map((z) => (
          <Button
            key={z}
            variant="outline"
            size="sm"
            onClick={() => setZoom(z)}
            data-testid={`oc-zoom-${z}`}
          >
            {z}%
          </Button>
        ))}
      </div>
      <Canvas className="flex-1 min-h-0 relative" />
    </div>
  );
}
