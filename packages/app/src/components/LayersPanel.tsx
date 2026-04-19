import { useEffect, useMemo, useRef, useState } from "react";
import { LayersProvider, useEditorMaybe } from "@grapesjs/react";
import type { Component, Editor } from "grapesjs";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Monitor,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react";
import { cn } from "../lib/utils.js";
import { Button } from "./ui/button.js";
import { iconForTag } from "../canvas/icons.js";
import {
  ARTBOARDS_CHANGED,
  deleteArtboard,
  renameArtboard,
} from "../canvas/artboards.js";

/* ─────────────────────────────── helpers ─────────────────────────────── */

type Mutable = {
  get?: (k: string) => unknown;
  set?: (attrs: Record<string, unknown>) => void;
};

function readAttr(obj: unknown, key: string): unknown {
  const g = (obj as Mutable).get;
  return typeof g === "function" ? g.call(obj, key) : undefined;
}

function cidOf(obj: unknown): string {
  return String(
    (obj as { cid?: string }).cid ??
      (obj as { id?: string }).id ??
      "",
  );
}

function deviceIcon(width: number) {
  if (width <= 420) return <Smartphone className="size-3.5 text-muted-foreground" aria-hidden />;
  if (width <= 820) return <Tablet className="size-3.5 text-muted-foreground" aria-hidden />;
  return <Monitor className="size-3.5 text-muted-foreground" aria-hidden />;
}

/* ─────────────────────────────── frames section (top) ────────────────── */

interface FrameRow {
  id: string;
  name: string;
  width: number;
  height: number;
}

function readFrames(frames: unknown[]): FrameRow[] {
  const out: FrameRow[] = [];
  for (const f of frames) {
    if (!f) continue;
    out.push({
      id: cidOf(f),
      name: String(readAttr(f, "name") ?? "Untitled"),
      width: Number(readAttr(f, "width") ?? 0) || 0,
      height: Number(readAttr(f, "height") ?? 0) || 0,
    });
  }
  return out;
}

function FramesSection() {
  const editor = useEditorMaybe();
  const editorRef = useRef(editor);
  editorRef.current = editor;

  const [rows, setRows] = useState<FrameRow[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!editor) return;
    const refresh = () => {
      try {
        const raw = editor.Canvas.getFrames?.() as unknown;
        const arr = Array.isArray(raw) ? raw.filter(Boolean) : [];
        setRows(readFrames(arr));
      } catch {
        // ignore
      }
    };
    editor.on("load", refresh);
    editor.on(ARTBOARDS_CHANGED, refresh);
    const t = setTimeout(refresh, 100);
    return () => {
      clearTimeout(t);
      editor.off("load", refresh);
      editor.off(ARTBOARDS_CHANGED, refresh);
    };
  }, [editor]);

  if (rows.length === 0) return null;

  const startRename = (row: FrameRow) => {
    setEditingId(row.id);
    setDraft(row.name);
  };

  const commit = () => {
    const ed = editorRef.current;
    if (!ed || !editingId) return;
    const next = draft.trim() || "Untitled";
    const id = editingId;
    setEditingId(null);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, name: next } : r)));
    renameArtboard(ed, id, next);
  };

  const remove = (row: FrameRow) => {
    const ed = editorRef.current;
    if (!ed) return;
    if (deleteArtboard(ed, row.id)) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    }
  };

  return (
    <section className="border-b border-border">
      <button
        type="button"
        className="flex items-center gap-1 w-full h-(--section-title-height) px-(--panel-padding) text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded((v) => !v)}
        data-testid="oc-frames-section-toggle"
      >
        {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        Frames
      </button>
      {expanded && (
        <div className="flex flex-col">
          {rows.map((row) => (
            <div
              key={row.id}
              className="group flex items-center gap-1.5 h-7 pl-3 pr-1 hover:bg-surface-sunken"
              data-testid={`oc-frame-row-${row.id}`}
            >
              {deviceIcon(row.width)}
              {editingId === row.id ? (
                <input
                  autoFocus
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commit();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setEditingId(null);
                    }
                  }}
                  className="flex-1 min-w-0 bg-transparent text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring rounded-sm px-1"
                  data-testid={`oc-frame-rename-input-${row.id}`}
                />
              ) : (
                <button
                  type="button"
                  onDoubleClick={() => startRename(row)}
                  className="flex-1 min-w-0 text-left text-sm text-foreground truncate"
                  title={`${row.name} — ${row.width}×${row.height}`}
                  data-testid={`oc-frame-name-${row.id}`}
                >
                  {row.name}
                </button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => remove(row)}
                aria-label="Delete frame"
                disabled={rows.length <= 1}
                title={rows.length <= 1 ? "Cannot delete the last frame" : "Delete frame"}
                data-testid={`oc-frame-delete-${row.id}`}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────── layer tree rows ─────────────────────── */

function readStyle(component: Component, key: string): string {
  const v = (component as unknown as { getStyle?: () => Record<string, unknown> }).getStyle?.()?.[key];
  return v == null ? "" : String(v);
}

function writeStyle(component: Component, key: string, value: string): void {
  (component as unknown as { addStyle?: (s: Record<string, string>) => void }).addStyle?.({
    [key]: value,
  });
}

function clearStyle(component: Component, key: string): void {
  const rm = (component as unknown as { removeStyle?: (k: string) => void }).removeStyle;
  if (typeof rm === "function") rm.call(component, key);
  else writeStyle(component, key, "");
}

/**
 * Lock state lives on a per-component data attribute rather than a CSS prop so
 * it round-trips in get/set attribute tooling and doesn't bleed into export.
 * A locked component has `data-oc-locked="true"`.
 */
function isLocked(component: Component): boolean {
  const a = (component as unknown as { getAttributes?: () => Record<string, unknown> }).getAttributes?.() ?? {};
  return a["data-oc-locked"] === "true";
}

function setLocked(component: Component, locked: boolean): void {
  const set = (component as unknown as {
    setAttributes?: (a: Record<string, unknown>) => void;
  }).setAttributes;
  if (typeof set !== "function") return;
  const current =
    (component as unknown as { getAttributes?: () => Record<string, unknown> }).getAttributes?.() ?? {};
  const next = { ...current };
  if (locked) next["data-oc-locked"] = "true";
  else delete next["data-oc-locked"];
  set.call(component, next);
}

interface LayerRowProps {
  component: Component;
  depth: number;
  editor: Editor | undefined;
  selected: Component | null;
}

function LayerRow({ component, depth, editor, selected }: LayerRowProps) {
  const [, force] = useState(0);
  const tag = (component.get("tagName") as string | undefined) ?? "";
  const label = component.getName?.() ?? tag ?? "node";
  const Icon = iconForTag(tag);
  const isSelected = selected?.getId() === component.getId();
  const hidden = readStyle(component, "display") === "none";
  const locked = isLocked(component);

  const children = useMemo(
    () => (component.components() as unknown as { toArray: () => Component[] }).toArray(),
    // Re-derive when the `force` counter ticks — GrapesJS mutates the children
    // collection in place, so we need a subscription signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [component, force],
  );

  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = (c: Component | null) => {
      if (!c) return;
      if (c === component) force((n) => n + 1);
    };
    editor.on("component:update", onUpdate);
    return () => {
      editor.off("component:update", onUpdate);
    };
  }, [editor, component]);

  const commit = () => {
    const next = draft.trim();
    if (!next) {
      setEditing(false);
      setDraft(label);
      return;
    }
    (component as unknown as { set?: (k: string, v: unknown) => void }).set?.("custom-name", next);
    setEditing(false);
  };

  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 h-7 pr-1 transition-colors relative",
          isSelected && "bg-oc-accent/15",
          !isSelected && "hover:bg-surface-sunken",
        )}
        style={{ paddingLeft: 4 + depth * 12 }}
        data-testid={`oc-layer-row-${component.getId()}`}
        data-selected={isSelected ? "true" : "false"}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center justify-center h-4 w-4 text-muted-foreground hover:text-foreground"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>
        ) : (
          <span className="h-4 w-4" />
        )}

        <Icon className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />

        {editing ? (
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
                setDraft(label);
              }
            }}
            className="flex-1 min-w-0 bg-transparent text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring rounded-sm px-1"
            data-testid="oc-layer-rename-input"
          />
        ) : (
          <button
            type="button"
            className={cn(
              "flex-1 min-w-0 text-left text-sm truncate",
              hidden && "opacity-50",
              locked && "italic",
            )}
            onClick={() => editor?.select(component)}
            onDoubleClick={() => {
              setDraft(label);
              setEditing(true);
            }}
          >
            {label}
          </button>
        )}

        {/* visibility + lock affordances: always visible when toggled on; fade in on hover otherwise */}
        <button
          type="button"
          className={cn(
            "flex items-center justify-center h-5 w-5 rounded-sm transition-opacity",
            hidden ? "opacity-100 text-foreground" : "opacity-0 group-hover:opacity-100 text-muted-foreground",
            "hover:bg-surface-sunken hover:text-foreground",
          )}
          aria-label={hidden ? "Show layer" : "Hide layer"}
          onClick={() => {
            if (hidden) clearStyle(component, "display");
            else writeStyle(component, "display", "none");
            force((n) => n + 1);
          }}
          data-testid={`oc-layer-visibility-${component.getId()}`}
        >
          {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
        <button
          type="button"
          className={cn(
            "flex items-center justify-center h-5 w-5 rounded-sm transition-opacity",
            locked ? "opacity-100 text-foreground" : "opacity-0 group-hover:opacity-100 text-muted-foreground",
            "hover:bg-surface-sunken hover:text-foreground",
          )}
          aria-label={locked ? "Unlock layer" : "Lock layer"}
          onClick={() => {
            setLocked(component, !locked);
            force((n) => n + 1);
          }}
          data-testid={`oc-layer-lock-${component.getId()}`}
        >
          {locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
        </button>
      </div>

      {expanded &&
        children.map((child) => (
          <LayerRow
            key={child.getId()}
            component={child}
            depth={depth + 1}
            editor={editor}
            selected={selected}
          />
        ))}
    </div>
  );
}

/* ─────────────────────────────── panel root ──────────────────────────── */

export function LayersPanel() {
  const editor = useEditorMaybe();
  const [selected, setSelected] = useState<Component | null>(null);

  useEffect(() => {
    if (!editor) return;
    const update = () => setSelected(editor.getSelected() ?? null);
    update();
    editor.on("component:selected component:deselected", update);
    return () => {
      editor.off("component:selected component:deselected", update);
    };
  }, [editor]);

  return (
    <div className="flex flex-col min-h-0 h-full overflow-auto">
      <FramesSection />
      <section>
        <div className="h-(--section-title-height) px-(--panel-padding) flex items-center text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
          Layers
        </div>
        <LayersProvider>
          {({ root }) => {
            if (!root) return <div className="p-2 text-xs text-muted-foreground">No layers</div>;
            const children = (root.components() as unknown as { toArray: () => Component[] }).toArray();
            if (children.length === 0) {
              return <div className="p-2 text-xs text-muted-foreground">Empty canvas</div>;
            }
            return (
              <div className="flex flex-col">
                {children.map((c) => (
                  <LayerRow
                    key={c.getId()}
                    component={c}
                    depth={0}
                    editor={editor ?? undefined}
                    selected={selected}
                  />
                ))}
              </div>
            );
          }}
        </LayersProvider>
      </section>
    </div>
  );
}
