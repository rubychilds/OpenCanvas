import { useEffect, useRef, useState } from "react";
import { useEditorMaybe } from "@grapesjs/react";
import { ARTBOARDS_CHANGED } from "../canvas/artboards.js";

const WIDTH = 160;
const HEIGHT = 120;
const PADDING = 6;

interface FrameRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
}

interface WorldBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function frameBounds(frames: FrameRect[]): WorldBounds {
  if (frames.length === 0) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const f of frames) {
    minX = Math.min(minX, f.x);
    minY = Math.min(minY, f.y);
    maxX = Math.max(maxX, f.x + f.width);
    maxY = Math.max(maxY, f.y + f.height);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Minimap overlay showing all artboards at a glance. Read-only in this first
 * cut — click-to-pan is a follow-up once GrapesJS exposes a public canvas-
 * scroll API that works with infiniteCanvas (today the only ergonomic pan is
 * via scrollLeft/scrollTop on an element we don't reliably expose).
 */
export function Minimap() {
  const editor = useEditorMaybe();
  const [frames, setFrames] = useState<FrameRect[]>([]);
  const [zoom, setZoom] = useState(100);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const refresh = () => {
      try {
        const raw = editor.Canvas.getFrames?.() as unknown;
        const arr = Array.isArray(raw) ? raw : [];
        const list: FrameRect[] = [];
        for (const f of arr) {
          if (!f) continue;
          const g = (f as { get?: (k: string) => unknown }).get;
          if (typeof g !== "function") continue;
          list.push({
            id: String(
              (f as { cid?: string }).cid ??
                (f as { id?: string }).id ??
                "",
            ),
            name: String(g.call(f, "name") ?? ""),
            x: Number(g.call(f, "x") ?? 0) || 0,
            y: Number(g.call(f, "y") ?? 0) || 0,
            width: Number(g.call(f, "width") ?? 0) || 0,
            height: Number(g.call(f, "height") ?? 0) || 0,
          });
        }
        setFrames(list);
        setZoom(editor.Canvas.getZoom?.() ?? 100);
      } catch (err) {
        console.warn("[opencanvas] minimap refresh failed:", err);
      }
    };

    const events = ["canvas:zoom", "load", ARTBOARDS_CHANGED] as const;
    events.forEach((ev) => editor.on(ev, refresh));
    const timer = setTimeout(refresh, 100);

    return () => {
      clearTimeout(timer);
      events.forEach((ev) => editor.off(ev, refresh));
    };
  }, [editor]);

  if (frames.length === 0) return null;

  const bounds = frameBounds(frames);
  const worldW = bounds.maxX - bounds.minX || 1;
  const worldH = bounds.maxY - bounds.minY || 1;
  const innerW = WIDTH - PADDING * 2;
  const innerH = HEIGHT - PADDING * 2;
  const scale = Math.min(innerW / worldW, innerH / worldH);

  const project = (x: number, y: number) => ({
    x: PADDING + (x - bounds.minX) * scale,
    y: PADDING + (y - bounds.minY) * scale,
  });

  return (
    <div
      ref={hostRef}
      className="absolute bottom-3 right-3 rounded-md border border-border bg-surface/90 backdrop-blur-sm shadow-sm pointer-events-none"
      style={{ width: WIDTH, height: HEIGHT }}
      data-testid="oc-minimap"
    >
      <div className="absolute inset-0 overflow-hidden rounded-md">
        {frames.map((f) => {
          const p = project(f.x, f.y);
          return (
            <div
              key={f.id}
              className="absolute bg-background border border-border"
              style={{
                left: p.x,
                top: p.y,
                width: Math.max(2, f.width * scale),
                height: Math.max(2, f.height * scale),
              }}
              data-testid={`oc-minimap-frame-${f.id}`}
              title={f.name}
            />
          );
        })}
      </div>
      <div
        className="absolute top-1 left-1 text-[9px] text-muted-foreground tabular-nums pointer-events-none"
        data-testid="oc-minimap-zoom"
      >
        {Math.round(zoom)}%
      </div>
    </div>
  );
}
