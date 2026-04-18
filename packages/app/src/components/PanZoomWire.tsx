import { useEffect } from "react";
import { useEditorMaybe } from "@grapesjs/react";

const ZOOM_MIN = 10;
const ZOOM_MAX = 400;
const ZOOM_STEP_WHEEL = 8; // percent per natural-wheel tick
const ZOOM_STEP_PINCH = 3; // percent per trackpad pinch delta

interface EditorWithCanvas {
  Canvas: {
    getZoom(): number;
    setZoom(v: number | string): unknown;
    getBody?(): HTMLElement | null;
    getFrameEl?(): HTMLIFrameElement | null;
    runCommand?(name: string): unknown;
  };
  runCommand(name: string): unknown;
}

/**
 * Attaches scroll-wheel zoom, space+drag pan, middle-click pan, and ⌘0 fit
 * to the outer canvas element. Rendered as a side-effect component inside
 * `<GjsEditor>` so it picks up the live editor via `useEditorMaybe`.
 *
 * GrapesJS's infinite-canvas mode handles the spatial transforms; this wire
 * just translates DOM events into `setZoom` / scroll adjustments.
 */
export function PanZoomWire() {
  const editor = useEditorMaybe() as unknown as EditorWithCanvas | undefined;

  useEffect(() => {
    if (!editor) return;
    const body = editor.Canvas.getBody?.() ?? null;
    const frameEl = editor.Canvas.getFrameEl?.() ?? null;
    // The spatial outer container lives outside the iframe; walk up to it.
    const host =
      (frameEl?.closest("[data-gjs-canvas]") as HTMLElement | null) ??
      (frameEl?.parentElement ?? null);
    const target: HTMLElement | null = host ?? body;
    if (!target) return;

    const clampZoom = (v: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v));

    // ── wheel / pinch ────────────────────────────────────────────────
    const onWheel = (ev: WheelEvent) => {
      // Pinch-to-zoom sets ctrlKey on deltas from trackpads; otherwise only
      // intercept when the user explicitly holds a zoom modifier. This keeps
      // natural scroll panning available in the outer container.
      const modifier = ev.ctrlKey || ev.metaKey;
      if (!modifier && !(ev as unknown as { ctrlKey: boolean }).ctrlKey) return;
      ev.preventDefault();
      const step = ev.ctrlKey && !ev.metaKey ? ZOOM_STEP_PINCH : ZOOM_STEP_WHEEL;
      const direction = ev.deltaY < 0 ? 1 : -1;
      const next = clampZoom(editor.Canvas.getZoom() + direction * step);
      editor.Canvas.setZoom(next);
    };
    target.addEventListener("wheel", onWheel, { passive: false });

    // ── space+drag / middle-click pan ────────────────────────────────
    let spaceDown = false;
    let panning = false;
    let lastX = 0;
    let lastY = 0;

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.code === "Space" && !ev.repeat) {
        const ae = document.activeElement as HTMLElement | null;
        const typing =
          ae?.tagName === "INPUT" ||
          ae?.tagName === "TEXTAREA" ||
          ae?.isContentEditable;
        if (typing) return;
        spaceDown = true;
        target.style.cursor = "grab";
        ev.preventDefault();
      }
      if ((ev.key === "0" || ev.code === "Digit0") && (ev.metaKey || ev.ctrlKey)) {
        ev.preventDefault();
        editor.Canvas.setZoom(100);
        editor.runCommand("core:canvas-fit");
      }
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.code === "Space") {
        spaceDown = false;
        target.style.cursor = "";
      }
    };

    const onPointerDown = (ev: PointerEvent) => {
      const middleClick = ev.button === 1;
      if (!spaceDown && !middleClick) return;
      panning = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
      target.setPointerCapture(ev.pointerId);
      target.style.cursor = "grabbing";
      ev.preventDefault();
    };
    const onPointerMove = (ev: PointerEvent) => {
      if (!panning) return;
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;
      target.scrollLeft -= dx;
      target.scrollTop -= dy;
    };
    const onPointerUp = (ev: PointerEvent) => {
      if (!panning) return;
      panning = false;
      try {
        target.releasePointerCapture(ev.pointerId);
      } catch {
        // ignore
      }
      target.style.cursor = spaceDown ? "grab" : "";
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    target.addEventListener("pointerdown", onPointerDown);
    target.addEventListener("pointermove", onPointerMove);
    target.addEventListener("pointerup", onPointerUp);
    target.addEventListener("pointercancel", onPointerUp);

    return () => {
      target.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      target.removeEventListener("pointerdown", onPointerDown);
      target.removeEventListener("pointermove", onPointerMove);
      target.removeEventListener("pointerup", onPointerUp);
      target.removeEventListener("pointercancel", onPointerUp);
      target.style.cursor = "";
    };
  }, [editor]);

  return null;
}
