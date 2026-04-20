import type { Editor } from "grapesjs";
import { ChevronDown } from "../../canvas/chrome-icons.js";
import {
  ARTBOARD_CATEGORIES,
  ARTBOARD_PRESETS,
  type ArtboardPreset,
  listArtboards,
  resizeArtboard,
} from "../../canvas/artboards.js";
import { cn } from "../../lib/utils.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.js";

export interface FrameTypeSwitcherProps {
  editor: Editor;
  frameId: string;
}

/**
 * Frame type/preset switcher shown at the top of the inspector when a frame's
 * wrapper is selected. Clicking the "Frame" label opens a device-preset
 * dropdown modelled after Figma's type-switcher (iPhone 17, MacBook Air,
 * iPad Pro, etc.). Selecting a preset resizes the frame via
 * `resizeArtboard`, keeping the origin in place.
 *
 * Height resize is applied alongside width — for frames (unlike the
 * breakpoint-preview flow that used to live in the Topbar, retired
 * 2026-04-19), users picking a device preset expect the full dimensions.
 */
export function FrameTypeSwitcher({ editor, frameId }: FrameTypeSwitcherProps) {
  const ab = listArtboards(editor).find((a) => a.id === frameId);
  const activePreset = ab
    ? ARTBOARD_PRESETS.find((p) => p.width === ab.width && p.height === ab.height)
    : undefined;

  const pick = (preset: ArtboardPreset) => {
    resizeArtboard(editor, frameId, preset.width, preset.height);
  };

  const presetsByCategory = ARTBOARD_CATEGORIES.map((cat) => ({
    ...cat,
    items: ARTBOARD_PRESETS.filter((p) => p.category === cat.id),
  })).filter((group) => group.items.length > 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1 px-1 -ml-1 rounded-sm",
            "text-sm text-foreground hover:bg-surface-sunken",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          )}
          data-testid="oc-ins-type-frame"
        >
          <span>Frame</span>
          <ChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[240px] max-h-[60vh] overflow-y-auto"
        data-testid="oc-ins-type-frame-menu"
      >
        {presetsByCategory.map((group, i) => (
          <div key={group.id}>
            {i > 0 ? <DropdownMenuSeparator /> : null}
            <div className="px-2 pt-1.5 pb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {group.label}
            </div>
            {group.items.map((preset) => {
              const active = activePreset?.id === preset.id;
              return (
                <DropdownMenuItem
                  key={preset.id}
                  onSelect={() => pick(preset)}
                  data-testid={`oc-ins-preset-${preset.id}`}
                  data-active={active ? "true" : undefined}
                  className={cn(active && "bg-surface-sunken text-foreground")}
                >
                  <span className="flex-1 truncate">{preset.label}</span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {preset.width} × {preset.height}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
