import { useEditorMaybe } from "@grapesjs/react";
import {
  Circle,
  FrameCorners,
  Image as ImageIcon,
  MousePointer,
  Square,
  Type,
  type LucideIcon,
} from "../canvas/chrome-icons.js";
import { cn } from "../lib/utils.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip.js";
import { createPrimitive, type PrimitiveType } from "../canvas/primitives.js";

interface Tool {
  id: string;
  label: string;
  shortcut?: string;
  Icon: LucideIcon;
  /** The primitive concept this tool inserts. `null` for the placeholder
   *  Select tool, which has no insertion behaviour yet. */
  primitive: PrimitiveType | null;
  disabled?: boolean;
}

/**
 * Tool order matches Penpot's left-rail vocabulary (per ADR-0005 §5):
 * Select · Frame · Rectangle · Ellipse · Text · Image. Button has been
 * retired from the rail — it's a compound, not a primitive in either
 * Figma or Penpot, and ships via the BlocksPanel / future Components
 * library instead.
 */
const TOOLS: Tool[] = [
  {
    id: "select",
    label: "Select",
    shortcut: "V",
    Icon: MousePointer,
    primitive: null,
    disabled: true,
  },
  { id: "frame", label: "Frame", shortcut: "F", Icon: FrameCorners, primitive: "frame" },
  { id: "rectangle", label: "Rectangle", shortcut: "R", Icon: Square, primitive: "rectangle" },
  { id: "ellipse", label: "Ellipse", shortcut: "O", Icon: Circle, primitive: "ellipse" },
  { id: "text", label: "Text", shortcut: "T", Icon: Type, primitive: "text" },
  { id: "image", label: "Image", shortcut: "I", Icon: ImageIcon, primitive: "image" },
];

export function InsertRail() {
  const editor = useEditorMaybe();

  const dispatch = (tool: Tool) => {
    if (!editor || !tool.primitive) return;
    createPrimitive(editor, tool.primitive);
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
              onClick={() => dispatch(tool)}
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
