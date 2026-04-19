import { useEffect, useState } from "react";
import { useEditorMaybe } from "@grapesjs/react";
import { ChevronDown, Minus, PlusOutline } from "../canvas/chrome-icons.js";
import { cn } from "../lib/utils.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.js";

const MIN_ZOOM = 10;
const MAX_ZOOM = 400;

function clamp(n: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(n)));
}

/**
 * Floating zoom control — sits bottom-right of the canvas viewport. The
 * pill-shaped affordance is `[−][NN%][+]` with the `NN%` opening a dropdown
 * of presets (fit / 50 / 100 / 200) on click. Matches the Figma convention.
 */
export function ZoomControl() {
  const editor = useEditorMaybe();
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (!editor) return;
    const update = () => setZoom(clamp(editor.Canvas.getZoom()));
    update();
    editor.on("canvas:zoom", update);
    return () => {
      editor.off("canvas:zoom", update);
    };
  }, [editor]);

  const apply = (next: number) => {
    const v = clamp(next);
    editor?.Canvas.setZoom(v);
    setZoom(v);
  };

  const step = (dir: 1 | -1) => {
    // 10% steps around round numbers; consistent with PanZoomWire's ZOOM_STEP_WHEEL.
    apply(zoom + dir * 10);
  };

  const fit = () => {
    editor?.runCommand("core:canvas-fit");
  };

  return (
    <div
      className={cn(
        "flex items-center h-8 rounded-md border border-border bg-surface/95 backdrop-blur-sm shadow-sm",
        "text-xs text-foreground",
      )}
      data-testid="oc-zoom-control"
    >
      <button
        type="button"
        className="flex items-center justify-center h-full w-7 rounded-l-md text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
        onClick={() => step(-1)}
        aria-label="Zoom out"
        data-testid="oc-zoom-out"
      >
        <Minus className="size-3.5" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 h-full px-2 tabular-nums hover:bg-surface-sunken transition-colors focus:outline-none"
            data-testid="oc-zoom-readout"
            aria-label="Zoom presets"
          >
            <span className="w-8 text-center">{zoom}%</span>
            <ChevronDown className="size-3 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="min-w-40">
          <DropdownMenuItem onSelect={fit} data-testid="oc-zoom-fit" shortcut="1">
            Zoom to fit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => apply(50)} data-testid="oc-zoom-50">
            Zoom to 50%
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => apply(100)} data-testid="oc-zoom-100" shortcut="⌘0">
            Zoom to 100%
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => apply(200)} data-testid="oc-zoom-200">
            Zoom to 200%
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        type="button"
        className="flex items-center justify-center h-full w-7 rounded-r-md text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
        onClick={() => step(1)}
        aria-label="Zoom in"
        data-testid="oc-zoom-in"
      >
        <PlusOutline className="size-3.5" />
      </button>
    </div>
  );
}
