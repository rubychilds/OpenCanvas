import { useEditorMaybe } from "@grapesjs/react";
import type { Component, Editor } from "grapesjs";
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils.js";

/**
 * Figma/Penpot-style selection overlay. Sits in the canvas layer, listens to
 * GrapesJS's `component:hovered` / `component:selected` events, and renders
 * a small label anchored to each component's bounding rect.
 *
 * GrapesJS already draws the bounding box + resize handles for the selected
 * component (via `grapes.min.css`). This overlay adds the information label
 * — tagName and W×H — that Figma puts at the bottom-right of the selection
 * and Penpot puts above the top-left.
 *
 * Bounding rects change with pan + zoom; the overlay re-reads them on every
 * RAF tick while any hint is visible. Cost is bounded because the RAF loop
 * runs only while something is hovered or selected.
 */

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function readRect(editor: Editor, component: Component): Rect | null {
  const el = (component as unknown as { getEl?: () => HTMLElement | null }).getEl?.() ?? null;
  if (!el) return null;
  const canvasEl =
    (editor.Canvas as unknown as { getFrameEl?: () => HTMLElement | null }).getFrameEl?.() ??
    null;
  // Fall back to the iframe's offsetParent chain if Canvas.getFrameEl is
  // unavailable in this GrapesJS version.
  const frameRect = canvasEl?.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  // Components inside the iframe report client coords relative to the iframe
  // viewport. Translate them into the host-document coord space by adding
  // the iframe's own top-left.
  const offsetX = frameRect ? frameRect.left : 0;
  const offsetY = frameRect ? frameRect.top : 0;
  return {
    left: rect.left + offsetX,
    top: rect.top + offsetY,
    width: rect.width,
    height: rect.height,
  };
}

function componentName(component: Component): string {
  const getName = (component as unknown as { getName?: () => string }).getName;
  const name = typeof getName === "function" ? getName.call(component) : "";
  if (name) return name;
  const tag = String(component.get?.("tagName") ?? "").toLowerCase();
  return tag || "element";
}

export function SelectionOverlay() {
  const editor = useEditorMaybe();
  const [hovered, setHovered] = useState<Component | null>(null);
  const [selected, setSelected] = useState<Component | null>(null);
  const [hoveredRect, setHoveredRect] = useState<Rect | null>(null);
  const [selectedRect, setSelectedRect] = useState<Rect | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!editor) return;

    const setHov = (c?: Component | null) => setHovered(c ?? null);
    const setSel = () => setSelected(editor.getSelected() ?? null);

    editor.on("component:hovered", setHov);
    editor.on("component:selected component:deselected", setSel);
    setSel();

    return () => {
      editor.off("component:hovered", setHov);
      editor.off("component:selected component:deselected", setSel);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || (!hovered && !selected)) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const tick = () => {
      if (hovered) setHoveredRect(readRect(editor, hovered));
      if (selected) setSelectedRect(readRect(editor, selected));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [editor, hovered, selected]);

  const showHoverLabel = hovered && hoveredRect && hovered !== selected;

  return (
    <div className="pointer-events-none fixed inset-0 z-30" data-testid="oc-selection-overlay">
      {showHoverLabel ? (
        <HoverLabel rect={hoveredRect!} label={componentName(hovered!)} dim={hoveredRect!} />
      ) : null}
      {selected && selectedRect ? (
        <DimensionBadge rect={selectedRect} dim={selectedRect} />
      ) : null}
    </div>
  );
}

function HoverLabel({
  rect,
  label,
  dim,
}: {
  rect: Rect;
  label: string;
  dim: Rect;
}) {
  const LABEL_HEIGHT = 18;
  const top = Math.max(0, rect.top - LABEL_HEIGHT - 2);
  return (
    <div
      className={cn(
        "absolute flex items-center gap-1.5 h-[18px] px-1.5 rounded-sm",
        "bg-oc-accent text-oc-accent-foreground text-[10px] tabular-nums",
        "font-medium whitespace-nowrap shadow-sm",
      )}
      style={{ left: rect.left, top }}
      data-testid="oc-selection-hover-label"
    >
      <span>{label}</span>
      <span className="text-oc-accent-foreground/70">
        {Math.round(dim.width)} × {Math.round(dim.height)}
      </span>
    </div>
  );
}

function DimensionBadge({ rect, dim }: { rect: Rect; dim: Rect }) {
  // Bottom-right corner, matching Figma. Anchored just outside the selection
  // bounds so the GrapesJS resize handles remain clear.
  const BADGE_GAP = 4;
  const left = rect.left + rect.width / 2;
  const top = rect.top + rect.height + BADGE_GAP;
  return (
    <div
      className={cn(
        "absolute -translate-x-1/2 flex items-center gap-1 h-[18px] px-1.5 rounded-sm",
        "bg-oc-accent text-oc-accent-foreground text-[10px] tabular-nums",
        "font-medium whitespace-nowrap shadow-sm",
      )}
      style={{ left, top }}
      data-testid="oc-selection-dim-badge"
    >
      <span>
        {Math.round(dim.width)} × {Math.round(dim.height)}
      </span>
    </div>
  );
}
