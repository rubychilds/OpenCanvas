import { useEffect, useState } from "react";
import type { Editor } from "grapesjs";
import { Monitor, Tablet, Smartphone } from "../canvas/chrome-icons.js";
import {
  ARTBOARDS_CHANGED,
  ARTBOARD_PRESETS,
  getActiveArtboardId,
  listArtboards,
  resizeArtboard,
  type DeviceId,
} from "../canvas/artboards.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip.js";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group.js";

const DEVICES: Array<{ id: DeviceId; label: string; Icon: typeof Monitor; width: number }> =
  ARTBOARD_PRESETS.filter((p): p is typeof p & { id: DeviceId } => p.id !== "custom").map(
    (p) => {
      const Icon = p.id === "desktop" ? Monitor : p.id === "tablet" ? Tablet : Smartphone;
      return { id: p.id, label: p.label, Icon, width: p.width };
    },
  );

function preset(width: number): DeviceId | "" {
  const match = DEVICES.find((d) => d.width === width);
  return match?.id ?? "";
}

export interface BreakpointToolbarProps {
  editor: Editor | null;
}

/**
 * Story 7.2 — responsive preview. Three-button toolbar that resizes the
 * currently-active artboard's iframe to a preset width (Desktop 1440px,
 * Tablet 768px, Mobile 375px). Tailwind responsive classes in the iframe
 * pick up the new width live because Tailwind v4 JIT evaluates breakpoints
 * against the iframe viewport — no canvas-level "responsive mode" state.
 *
 * Height is preserved so users don't lose their layout when previewing
 * across breakpoints. For explicit width + height control, MeasuresSection
 * on the selected artboard frame is still the primary surface.
 */
export function BreakpointToolbar({ editor }: BreakpointToolbarProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeWidth, setActiveWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!editor) return;
    const refresh = () => {
      const id = getActiveArtboardId(editor);
      setActiveId(id);
      if (id) {
        const ab = listArtboards(editor).find((a) => a.id === id);
        setActiveWidth(ab ? ab.width : null);
      } else {
        setActiveWidth(null);
      }
    };
    refresh();
    editor.on("component:selected component:deselected", refresh);
    editor.on(ARTBOARDS_CHANGED, refresh);
    return () => {
      editor.off("component:selected component:deselected", refresh);
      editor.off(ARTBOARDS_CHANGED, refresh);
    };
  }, [editor]);

  const selected = activeWidth != null ? preset(activeWidth) : "";

  const pick = (id: DeviceId) => {
    if (!editor || !activeId) return;
    const target = DEVICES.find((d) => d.id === id);
    if (!target) return;
    resizeArtboard(editor, activeId, target.width);
  };

  return (
    <ToggleGroup
      type="single"
      value={selected}
      onValueChange={(v) => v && pick(v as DeviceId)}
      variant="ghost"
      data-testid="oc-breakpoint-toolbar"
    >
      {DEVICES.map(({ id, label, Icon, width }) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value={id}
              aria-label={`${label} (${width}px)`}
              data-testid={`oc-breakpoint-${id}`}
            >
              <Icon />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>
            {label} · {width}px
          </TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
}
