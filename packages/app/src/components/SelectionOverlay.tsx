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
 * component (via `grapes.min.css`). This overlay adds:
 *   - a Figma-style dimension badge at bottom-center of the selection
 *   - a Penpot-style hover label (tagName + W×H) above the hovered component
 *   - Penpot/Figma-style smart guides + spacing pills whenever a different
 *     component is hovered alongside a selection (aka "alt-hover distances")
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

/** Pixel threshold within which two edges/centers are treated as aligned. */
const ALIGN_THRESHOLD = 1.5;

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
  // Spacing + alignment guides light up only when a *different* component is
  // hovered alongside the selection — Penpot's "distances" pattern. Restrict
  // to siblings to avoid ambiguous self-contained guides (hovering the parent
  // wrapper while the child is selected always shows zero gap, which is noise).
  const showSpacing =
    selected &&
    hovered &&
    hovered !== selected &&
    selectedRect &&
    hoveredRect &&
    areSiblings(selected, hovered);

  return (
    <div className="pointer-events-none fixed inset-0 z-30" data-testid="oc-selection-overlay">
      {showHoverLabel ? (
        <HoverLabel rect={hoveredRect!} label={componentName(hovered!)} dim={hoveredRect!} />
      ) : null}
      {selected && selectedRect ? (
        <DimensionBadge rect={selectedRect} dim={selectedRect} />
      ) : null}
      {showSpacing ? (
        <SmartGuides selectedRect={selectedRect!} hoveredRect={hoveredRect!} />
      ) : null}
    </div>
  );
}

function areSiblings(a: Component, b: Component): boolean {
  const parentOf = (c: Component) =>
    (c as unknown as { parent?: () => Component | undefined }).parent?.();
  return Boolean(parentOf(a) && parentOf(a) === parentOf(b));
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

/**
 * Renders spacing indicators (pills with pixel distance) between the selected
 * and hovered components on each axis where they don't overlap, plus dashed
 * alignment guides wherever the two rects share an edge or centerline.
 *
 * Overlap vs gap decision per axis:
 *   - if sel.right ≤ hov.left          → horizontal gap, pill in between
 *   - else if hov.right ≤ sel.left     → horizontal gap (other direction)
 *   - else                              → axes overlap, no horizontal pill
 * Same for vertical.
 */
function SmartGuides({
  selectedRect: sel,
  hoveredRect: hov,
}: {
  selectedRect: Rect;
  hoveredRect: Rect;
}) {
  const selRight = sel.left + sel.width;
  const selBottom = sel.top + sel.height;
  const selCenterX = sel.left + sel.width / 2;
  const selCenterY = sel.top + sel.height / 2;
  const hovRight = hov.left + hov.width;
  const hovBottom = hov.top + hov.height;
  const hovCenterX = hov.left + hov.width / 2;
  const hovCenterY = hov.top + hov.height / 2;

  // Horizontal gap (sel to the left of hov, or vice versa).
  let horizontal: { left: number; right: number; midY: number } | null = null;
  if (selRight <= hov.left) {
    horizontal = {
      left: selRight,
      right: hov.left,
      midY: (Math.max(sel.top, hov.top) + Math.min(selBottom, hovBottom)) / 2,
    };
  } else if (hovRight <= sel.left) {
    horizontal = {
      left: hovRight,
      right: sel.left,
      midY: (Math.max(sel.top, hov.top) + Math.min(selBottom, hovBottom)) / 2,
    };
  }

  // Vertical gap (sel above hov, or vice versa).
  let vertical: { top: number; bottom: number; midX: number } | null = null;
  if (selBottom <= hov.top) {
    vertical = {
      top: selBottom,
      bottom: hov.top,
      midX: (Math.max(sel.left, hov.left) + Math.min(selRight, hovRight)) / 2,
    };
  } else if (hovBottom <= sel.top) {
    vertical = {
      top: hovBottom,
      bottom: sel.top,
      midX: (Math.max(sel.left, hov.left) + Math.min(selRight, hovRight)) / 2,
    };
  }

  // Alignment: edges + centers. `ALIGN_THRESHOLD` covers fp rounding.
  const vAlignLines: number[] = [];
  const hAlignLines: number[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) <= ALIGN_THRESHOLD;
  if (near(sel.left, hov.left)) vAlignLines.push(sel.left);
  if (near(selRight, hovRight)) vAlignLines.push(selRight);
  if (near(selCenterX, hovCenterX)) vAlignLines.push(selCenterX);
  if (near(sel.top, hov.top)) hAlignLines.push(sel.top);
  if (near(selBottom, hovBottom)) hAlignLines.push(selBottom);
  if (near(selCenterY, hovCenterY)) hAlignLines.push(selCenterY);

  return (
    <>
      {horizontal ? (
        <SpacingHorizontal
          left={horizontal.left}
          right={horizontal.right}
          midY={horizontal.midY}
        />
      ) : null}
      {vertical ? (
        <SpacingVertical
          top={vertical.top}
          bottom={vertical.bottom}
          midX={vertical.midX}
        />
      ) : null}
      {vAlignLines.map((x, i) => (
        <AlignLine key={`v${i}`} orientation="vertical" coord={x} testid={`oc-align-v-${i}`} />
      ))}
      {hAlignLines.map((y, i) => (
        <AlignLine key={`h${i}`} orientation="horizontal" coord={y} testid={`oc-align-h-${i}`} />
      ))}
    </>
  );
}

function SpacingPill({
  left,
  top,
  value,
  testid,
}: {
  left: number;
  top: number;
  value: number;
  testid: string;
}) {
  return (
    <div
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 flex items-center h-4 px-1 rounded-sm",
        "bg-oc-danger text-white text-[10px] tabular-nums",
        "font-medium whitespace-nowrap shadow-sm pointer-events-none",
      )}
      style={{ left, top }}
      data-testid={testid}
    >
      {Math.round(value)}
    </div>
  );
}

function SpacingHorizontal({
  left,
  right,
  midY,
}: {
  left: number;
  right: number;
  midY: number;
}) {
  const width = right - left;
  return (
    <>
      <div
        className="absolute bg-oc-danger pointer-events-none"
        style={{ left, top: midY - 0.5, width, height: 1 }}
        data-testid="oc-spacing-h-line"
      />
      <SpacingPill
        left={left + width / 2}
        top={midY}
        value={width}
        testid="oc-spacing-h-label"
      />
    </>
  );
}

function SpacingVertical({
  top,
  bottom,
  midX,
}: {
  top: number;
  bottom: number;
  midX: number;
}) {
  const height = bottom - top;
  return (
    <>
      <div
        className="absolute bg-oc-danger pointer-events-none"
        style={{ left: midX - 0.5, top, width: 1, height }}
        data-testid="oc-spacing-v-line"
      />
      <SpacingPill
        left={midX}
        top={top + height / 2}
        value={height}
        testid="oc-spacing-v-label"
      />
    </>
  );
}

function AlignLine({
  orientation,
  coord,
  testid,
}: {
  orientation: "vertical" | "horizontal";
  coord: number;
  testid: string;
}) {
  const style: React.CSSProperties =
    orientation === "vertical"
      ? { left: coord - 0.5, top: 0, width: 1, height: "100%" }
      : { top: coord - 0.5, left: 0, height: 1, width: "100%" };
  return (
    <div
      className="absolute bg-oc-accent/70 pointer-events-none"
      style={{ ...style, backgroundImage: "none" }}
      data-testid={testid}
    />
  );
}
