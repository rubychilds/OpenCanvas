import { useEffect, useRef, useState } from "react";
import { useEditorMaybe } from "@grapesjs/react";
import { Monitor, Smartphone, Tablet, Trash2 } from "lucide-react";
import { cn } from "../lib/utils.js";
import { Button } from "./ui/button.js";
import {
  ARTBOARDS_CHANGED,
  deleteArtboard,
  renameArtboard,
} from "../canvas/artboards.js";

interface FrameRow {
  id: string;
  name: string;
  width: number;
  height: number;
}

type Mutable = { get?: (k: string) => unknown };

function read(frames: unknown[]): FrameRow[] {
  const out: FrameRow[] = [];
  for (const f of frames) {
    if (!f) continue;
    const g = (f as Mutable).get;
    if (typeof g !== "function") continue;
    out.push({
      id: String(
        (f as { cid?: string }).cid ??
          (f as { id?: string }).id ??
          "",
      ),
      name: String(g.call(f, "name") ?? "Untitled"),
      width: Number(g.call(f, "width") ?? 0) || 0,
      height: Number(g.call(f, "height") ?? 0) || 0,
    });
  }
  return out;
}

function deviceIcon(width: number) {
  if (width <= 420) return <Smartphone className="size-3.5 text-muted-foreground" />;
  if (width <= 820) return <Tablet className="size-3.5 text-muted-foreground" />;
  return <Monitor className="size-3.5 text-muted-foreground" />;
}

export function ArtboardsPanel() {
  const editor = useEditorMaybe();
  const editorRef = useRef(editor);
  editorRef.current = editor;

  const [rows, setRows] = useState<FrameRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");

  useEffect(() => {
    if (!editor) return;
    const refresh = () => {
      try {
        const raw = editor.Canvas.getFrames?.() as unknown;
        const arr = Array.isArray(raw) ? raw.filter(Boolean) : [];
        setRows(read(arr));
      } catch (err) {
        console.warn("[opencanvas] artboards panel refresh failed:", err);
      }
    };

    const events = ["load", ARTBOARDS_CHANGED] as const;
    events.forEach((ev) => editor.on(ev, refresh));
    const timer = setTimeout(refresh, 100);

    return () => {
      clearTimeout(timer);
      events.forEach((ev) => editor.off(ev, refresh));
    };
  }, [editor]);

  const startRename = (row: FrameRow) => {
    setEditingId(row.id);
    setDraft(row.name);
  };

  const commitRename = () => {
    if (!editingId) return;
    const id = editingId;
    const next = draft.trim() || "Untitled";
    setEditingId(null);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, name: next } : r)));
    const ed = editorRef.current;
    if (ed) renameArtboard(ed, id, next);
  };

  const remove = (row: FrameRow) => {
    const ed = editorRef.current;
    if (!ed) return;
    if (deleteArtboard(ed, row.id)) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    }
  };

  if (rows.length === 0) {
    return <div className="p-2 text-xs text-muted-foreground">No artboards yet — add one from the canvas toolbar.</div>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {rows.map((row) => (
        <div
          key={row.id}
          className="group grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2 h-7 rounded-sm hover:bg-surface-sunken"
          data-testid={`oc-artboard-row-${row.id}`}
        >
          {deviceIcon(row.width)}
          {editingId === row.id ? (
            <input
              autoFocus
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitRename();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setEditingId(null);
                }
              }}
              className={cn(
                "min-w-0 bg-transparent text-sm text-foreground",
                "focus:outline-none focus:ring-1 focus:ring-ring rounded-sm px-1",
              )}
              data-testid="oc-artboard-rename-input"
            />
          ) : (
            <button
              type="button"
              onDoubleClick={() => startRename(row)}
              className="min-w-0 text-left text-sm text-foreground truncate"
              title={`${row.name} — ${row.width}×${row.height}`}
              data-testid={`oc-artboard-name-${row.id}`}
            >
              {row.name}
              <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                {row.width}×{row.height}
              </span>
            </button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
            onClick={() => remove(row)}
            aria-label="Delete artboard"
            title={rows.length <= 1 ? "Cannot delete the last artboard" : "Delete artboard"}
            disabled={rows.length <= 1}
            data-testid={`oc-artboard-delete-${row.id}`}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
    </div>
  );
}
