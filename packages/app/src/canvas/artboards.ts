import type { Editor, Frame } from "grapesjs";

export type DeviceId = "desktop" | "tablet" | "mobile";

export interface ArtboardPreset {
  id: DeviceId | "custom";
  label: string;
  width: number;
  height: number;
}

export const ARTBOARD_PRESETS: ArtboardPreset[] = [
  { id: "desktop", label: "Desktop", width: 1440, height: 900 },
  { id: "tablet", label: "Tablet", width: 768, height: 1024 },
  { id: "mobile", label: "Mobile", width: 375, height: 812 },
  { id: "custom", label: "Custom", width: 800, height: 600 },
];

export const DEFAULT_ARTBOARD_GAP = 80;

interface FrameData {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function readFrameData(frame: Frame): FrameData {
  const id =
    (frame as unknown as { getId?: () => string }).getId?.() ??
    (frame as unknown as { id?: string }).id ??
    "";
  const attrs = (frame as unknown as { attributes?: Record<string, unknown> }).attributes ?? {};
  const getAttr = (key: string): unknown =>
    (frame as unknown as { get?: (k: string) => unknown }).get?.(key) ?? attrs[key];
  return {
    id,
    name: String(getAttr("name") ?? "Untitled"),
    x: Number(getAttr("x") ?? 0),
    y: Number(getAttr("y") ?? 0),
    width: Number(getAttr("width") ?? 1440),
    height: Number(getAttr("height") ?? 900),
  };
}

export function listArtboards(editor: Editor): FrameData[] {
  return editor.Canvas.getFrames().map(readFrameData);
}

/**
 * Given a desired width/height, suggest a canvas-world position that doesn't
 * overlap any existing artboard. Places new artboards to the right of the
 * existing set, separated by DEFAULT_ARTBOARD_GAP.
 */
export function findPlacement(
  editor: Editor,
  width: number,
  height: number,
): { x: number; y: number } {
  const existing = listArtboards(editor);
  if (existing.length === 0) return { x: 0, y: 0 };

  // rightmost edge across all artboards
  let rightmost = -Infinity;
  let topOfRightmost = 0;
  for (const f of existing) {
    const right = f.x + f.width;
    if (right > rightmost) {
      rightmost = right;
      topOfRightmost = f.y;
    }
  }
  return {
    x: rightmost + DEFAULT_ARTBOARD_GAP,
    y: topOfRightmost,
  };
}

export interface CreateArtboardOptions {
  name?: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export function createArtboard(editor: Editor, opts: CreateArtboardOptions): FrameData {
  const { x, y } = opts.x != null && opts.y != null
    ? { x: opts.x, y: opts.y }
    : findPlacement(editor, opts.width, opts.height);
  const name = opts.name ?? `Artboard ${listArtboards(editor).length + 1}`;

  const frame = editor.Canvas.addFrame({
    name,
    x,
    y,
    width: opts.width,
    height: opts.height,
    components: "",
    styles: "",
  });
  return readFrameData(frame);
}

/**
 * Seed a default Desktop artboard on an empty canvas. Called after the saved
 * project (if any) has been loaded.
 *   - 0 frames → create a Desktop artboard.
 *   - ≥1 frames, first frame is unnamed (auto-created by GrapesJS init) →
 *     normalize it to Desktop dimensions + name.
 *   - ≥1 frames and first frame already has a name → trust it (saved project
 *     restore).
 */
export function ensureDefaultArtboard(editor: Editor): void {
  const frames = editor.Canvas.getFrames();
  if (frames.length === 0) {
    createArtboard(editor, {
      name: "Desktop",
      width: 1440,
      height: 900,
      x: 0,
      y: 0,
    });
    return;
  }
  const first = frames[0]!;
  const mutable = first as unknown as {
    get?: (k: string) => unknown;
    set?: (attrs: Record<string, unknown>) => void;
  };
  const existingName = mutable.get?.("name");
  if (!existingName) {
    mutable.set?.({
      name: "Desktop",
      x: 0,
      y: 0,
      width: 1440,
      height: 900,
    });
  }
}
