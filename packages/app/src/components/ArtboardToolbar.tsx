import { useEditorMaybe } from "@grapesjs/react";
import { Plus } from "lucide-react";
import { Button } from "./ui/button.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip.js";
import { ARTBOARD_PRESETS, createArtboard, type ArtboardPreset } from "../canvas/artboards.js";

function promptCustom(): { width: number; height: number } | null {
  const raw = typeof window !== "undefined" ? window.prompt("Size (W x H, e.g. 1280x800)") : null;
  if (!raw) return null;
  const match = /^\s*(\d+)\s*[x×]\s*(\d+)\s*$/i.exec(raw);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

export function ArtboardToolbar() {
  const editor = useEditorMaybe();

  const onAdd = (preset: ArtboardPreset) => {
    if (!editor) return;
    if (preset.id === "custom") {
      const dims = promptCustom();
      if (!dims) return;
      createArtboard(editor, { name: "Custom", ...dims });
      return;
    }
    createArtboard(editor, { name: preset.label, width: preset.width, height: preset.height });
  };

  return (
    <div className="flex items-center gap-1">
      {ARTBOARD_PRESETS.map((preset) => (
        <Tooltip key={preset.id}>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAdd(preset)}
              data-testid={`oc-add-artboard-${preset.id}`}
            >
              <Plus />
              {preset.label}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {preset.id === "custom"
              ? "New artboard (prompt for size)"
              : `New ${preset.label} artboard (${preset.width}×${preset.height})`}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
