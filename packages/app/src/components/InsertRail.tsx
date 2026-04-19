import { useEditorMaybe } from "@grapesjs/react";
import {
  Image as ImageIcon,
  MousePointer,
  MousePointerClick,
  Square,
  Type,
  type LucideIcon,
} from "../canvas/chrome-icons.js";
import { cn } from "../lib/utils.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip.js";
import { createArtboard } from "../canvas/artboards.js";

type Action =
  | { kind: "select" }
  | { kind: "frame" }
  | { kind: "text" }
  | { kind: "image" }
  | { kind: "button" };

interface Tool {
  id: string;
  label: string;
  shortcut?: string;
  Icon: LucideIcon;
  action: Action;
  /** Disabled tools render muted and don't fire. Used for Select which has no
   *  alternate-tool state yet. */
  disabled?: boolean;
}

const TOOLS: Tool[] = [
  { id: "select", label: "Select", shortcut: "V", Icon: MousePointer, action: { kind: "select" }, disabled: true },
  { id: "frame", label: "Frame", shortcut: "F", Icon: Square, action: { kind: "frame" } },
  { id: "text", label: "Text", shortcut: "T", Icon: Type, action: { kind: "text" } },
  { id: "image", label: "Image", shortcut: "I", Icon: ImageIcon, action: { kind: "image" } },
  { id: "button", label: "Button", shortcut: "B", Icon: MousePointerClick, action: { kind: "button" } },
];

const BUTTON_HTML = `<button class="px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700">Button</button>`;
const TEXT_HTML = `<p class="text-base leading-relaxed">Text</p>`;
const IMAGE_HTML = `<img src="" alt="" class="max-w-full h-auto" />`;

export function InsertRail() {
  const editor = useEditorMaybe();

  const dispatch = (action: Action) => {
    if (!editor) return;
    switch (action.kind) {
      case "select":
        return;
      case "frame":
        createArtboard(editor, { name: "Frame", width: 1440, height: 900 });
        return;
      case "text":
        editor.addComponents(TEXT_HTML);
        return;
      case "image":
        editor.addComponents(IMAGE_HTML);
        return;
      case "button":
        editor.addComponents(BUTTON_HTML);
        return;
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 p-1 rounded-md border border-border bg-surface/95 backdrop-blur-sm shadow-sm",
      )}
      role="toolbar"
      aria-label="Insert"
      data-testid="oc-insert-rail"
    >
      {TOOLS.map((tool) => (
        <Tooltip key={tool.id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-sm transition-colors",
                "text-muted-foreground hover:text-foreground hover:bg-surface-sunken",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                tool.disabled && "opacity-40 cursor-not-allowed",
              )}
              onClick={() => dispatch(tool.action)}
              disabled={tool.disabled}
              aria-label={tool.label}
              data-testid={`oc-insert-${tool.id}`}
            >
              <tool.Icon className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            <span>{tool.label}</span>
            {tool.shortcut ? (
              <span className="text-[10px] tabular-nums text-muted-foreground">{tool.shortcut}</span>
            ) : null}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
