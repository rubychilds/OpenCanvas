import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useEditorMaybe } from "@grapesjs/react";
import type { Editor } from "grapesjs";
import {
  ARTBOARD_CATEGORIES,
  ARTBOARD_PRESETS,
  createArtboard,
  type ArtboardCategory,
} from "../canvas/artboards.js";
import { createPrimitive } from "../canvas/primitives.js";
import { saveProject } from "../canvas/persistence.js";
import { getVariables } from "../canvas/variables.js";
import {
  Circle,
  FrameCorners,
  Image as ImageIcon,
  Square,
  Type,
  type LucideIcon,
} from "../canvas/chrome-icons.js";
import { cn } from "../lib/utils.js";

/**
 * Command palette (⌘K / Ctrl+K). Exposes the most common editor actions —
 * insert primitives, create framed artboards from device presets, save, fit
 * canvas, zoom levels — behind a single keyboard-driven surface so power
 * users don't hunt through menus.
 *
 * Backed by `cmdk` (per ADR-0001). Opened + closed by a ⌘K listener bound
 * here — no central key-router yet.
 */

interface CommandEntry {
  id: string;
  label: string;
  /** Keywords fed into cmdk's fuzzy filter in addition to the visible label. */
  keywords?: string[];
  shortcut?: string;
  Icon?: LucideIcon;
  run: (editor: Editor) => void;
}

function editorCommands(): CommandEntry[] {
  return [
    {
      id: "insert.frame",
      label: "Insert frame",
      keywords: ["frame", "artboard", "container"],
      shortcut: "F",
      Icon: FrameCorners,
      run: (editor) => createPrimitive(editor, "frame"),
    },
    {
      id: "insert.rectangle",
      label: "Insert rectangle",
      keywords: ["rectangle", "rect", "box", "shape"],
      shortcut: "R",
      Icon: Square,
      run: (editor) => createPrimitive(editor, "rectangle"),
    },
    {
      id: "insert.ellipse",
      label: "Insert ellipse",
      keywords: ["ellipse", "circle", "shape", "oval"],
      shortcut: "O",
      Icon: Circle,
      run: (editor) => createPrimitive(editor, "ellipse"),
    },
    {
      id: "insert.text",
      label: "Insert text",
      keywords: ["text", "label", "type"],
      shortcut: "T",
      Icon: Type,
      run: (editor) => createPrimitive(editor, "text"),
    },
    {
      id: "insert.image",
      label: "Insert image",
      keywords: ["image", "picture", "photo", "img"],
      shortcut: "I",
      Icon: ImageIcon,
      run: (editor) => createPrimitive(editor, "image"),
    },
    {
      id: "canvas.fit",
      label: "Zoom to fit",
      keywords: ["fit", "zoom", "canvas", "all"],
      shortcut: "⌘0",
      run: (editor) => {
        editor.runCommand("core:canvas-fit");
      },
    },
    {
      id: "canvas.zoom.50",
      label: "Zoom to 50%",
      keywords: ["zoom", "50"],
      run: (editor) => editor.Canvas.setZoom(50),
    },
    {
      id: "canvas.zoom.100",
      label: "Zoom to 100%",
      keywords: ["zoom", "100"],
      run: (editor) => editor.Canvas.setZoom(100),
    },
    {
      id: "canvas.zoom.200",
      label: "Zoom to 200%",
      keywords: ["zoom", "200"],
      run: (editor) => editor.Canvas.setZoom(200),
    },
    {
      id: "file.save",
      label: "Save project",
      keywords: ["save", "persist"],
      shortcut: "⌘S",
      run: (editor) => {
        void saveProject({
          ...(editor.getProjectData() as Record<string, unknown>),
          cssVariables: getVariables(),
        });
      },
    },
    {
      id: "selection.duplicate",
      label: "Duplicate selection",
      keywords: ["duplicate", "copy"],
      shortcut: "⌘D",
      run: (editor) => {
        if (!editor.getSelected()) return;
        editor.runCommand("core:copy");
        editor.runCommand("core:paste");
      },
    },
    {
      id: "selection.delete",
      label: "Delete selection",
      keywords: ["delete", "remove"],
      run: (editor) => {
        const sel = editor.getSelected();
        (sel as unknown as { remove?: () => void } | undefined)?.remove?.();
      },
    },
  ];
}

function presetLabel(category: ArtboardCategory): string {
  return ARTBOARD_CATEGORIES.find((c) => c.id === category)?.label ?? category;
}

export function CommandPalette() {
  const editor = useEditorMaybe();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.metaKey || ev.ctrlKey) && (ev.key === "k" || ev.key === "K")) {
        ev.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const run = (action: (editor: Editor) => void) => {
    if (!editor) return;
    setOpen(false);
    // Defer one tick so the palette unmounts before the command fires — some
    // commands (insert primitives) expect document focus, and the cmdk input
    // eats that until the dialog closes.
    setTimeout(() => action(editor), 0);
  };

  const commands = editorCommands();

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-center pt-[20vh]",
        "bg-background/40 backdrop-blur-sm",
      )}
      data-testid="oc-command-palette"
    >
      <div
        className={cn(
          "w-[520px] max-w-[90vw] rounded-lg border border-border bg-popover shadow-xl",
          "overflow-hidden flex flex-col",
        )}
      >
        <Command.Input
          placeholder="Type a command or search…"
          className={cn(
            "w-full h-11 px-3 bg-transparent text-sm text-foreground",
            "border-b border-border focus:outline-none placeholder:text-muted-foreground",
          )}
          data-testid="oc-command-palette-input"
        />
        <Command.List className="max-h-[320px] overflow-y-auto p-1">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>
          <Command.Group
            heading="Actions"
            className={cn(
              "text-muted-foreground",
              "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5",
              "[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase",
              "[&_[cmdk-group-heading]]:tracking-wider",
            )}
          >
            {commands.map((cmd) => (
              <PaletteItem
                key={cmd.id}
                value={`${cmd.label} ${cmd.keywords?.join(" ") ?? ""}`}
                label={cmd.label}
                shortcut={cmd.shortcut}
                Icon={cmd.Icon}
                onSelect={() => run(cmd.run)}
                testid={`oc-cmd-${cmd.id}`}
              />
            ))}
          </Command.Group>

          {ARTBOARD_CATEGORIES.map((cat) => (
            <Command.Group
              key={cat.id}
              heading={`Create artboard · ${presetLabel(cat.id)}`}
              className={cn(
                "text-muted-foreground",
                "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5",
                "[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase",
                "[&_[cmdk-group-heading]]:tracking-wider",
              )}
            >
              {ARTBOARD_PRESETS.filter((p) => p.category === cat.id).map((preset) => (
                <PaletteItem
                  key={preset.id}
                  value={`create artboard ${preset.label} ${preset.category} ${preset.width} ${preset.height}`}
                  label={preset.label}
                  hint={`${preset.width} × ${preset.height}`}
                  Icon={FrameCorners}
                  onSelect={() =>
                    run((editor) =>
                      createArtboard(editor, {
                        name: preset.label,
                        width: preset.width,
                        height: preset.height,
                      }),
                    )
                  }
                  testid={`oc-cmd-artboard-${preset.id}`}
                />
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}

function PaletteItem({
  value,
  label,
  shortcut,
  hint,
  Icon,
  onSelect,
  testid,
}: {
  value: string;
  label: string;
  shortcut?: string;
  hint?: string;
  Icon?: LucideIcon;
  onSelect: () => void;
  testid: string;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-2 h-8 px-2 rounded-sm cursor-pointer text-sm text-foreground",
        "data-[selected=true]:bg-oc-accent/15 data-[selected=true]:text-foreground",
        "transition-colors",
      )}
      data-testid={testid}
    >
      {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {hint ? (
        <span className="text-[10px] tabular-nums text-muted-foreground">{hint}</span>
      ) : null}
      {shortcut ? (
        <span className="text-[10px] tabular-nums text-muted-foreground">{shortcut}</span>
      ) : null}
    </Command.Item>
  );
}
