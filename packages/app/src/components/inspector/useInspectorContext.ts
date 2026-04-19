import { useMemo } from "react";
import type { Component } from "grapesjs";

/**
 * Parent-type awareness per ADR-0003. Sections use this to decide whether to
 * render themselves (e.g. Layout Item only makes sense when the selected
 * component's parent is a flex or grid container).
 *
 * All fields are cheap booleans derived from the parent's `display` + `position`
 * CSS. `useMemo` keyed off the component instance so re-renders don't rework
 * everything when unrelated state ticks.
 */
export interface InspectorContext {
  isFlexParent: boolean;
  isGridParent: boolean;
  /** True when `component` lives inside a flex or grid layout. */
  isLayoutChild: boolean;
  /**
   * True when the component itself has `position: absolute | fixed`, in which
   * case Layout Item controls don't apply even when the parent is a flex.
   */
  isLayoutChildAbsolute: boolean;
}

function readParentStyle(component: Component, key: string): string {
  const parent = (component as unknown as { parent?: () => Component | undefined }).parent?.();
  if (!parent) return "";
  const style = (parent as unknown as { getStyle?: () => Record<string, unknown> }).getStyle?.();
  const raw = style?.[key];
  return raw == null ? "" : String(raw).trim();
}

function readSelfStyle(component: Component, key: string): string {
  const style = (component as unknown as { getStyle?: () => Record<string, unknown> }).getStyle?.();
  const raw = style?.[key];
  return raw == null ? "" : String(raw).trim();
}

export function useInspectorContext(component: Component | null): InspectorContext {
  return useMemo(() => {
    if (!component) {
      return {
        isFlexParent: false,
        isGridParent: false,
        isLayoutChild: false,
        isLayoutChildAbsolute: false,
      };
    }
    const parentDisplay = readParentStyle(component, "display");
    const position = readSelfStyle(component, "position");
    const isFlex = parentDisplay === "flex" || parentDisplay === "inline-flex";
    const isGrid = parentDisplay === "grid" || parentDisplay === "inline-grid";
    const isAbsolute = position === "absolute" || position === "fixed";
    return {
      isFlexParent: isFlex,
      isGridParent: isGrid,
      isLayoutChild: (isFlex || isGrid) && !isAbsolute,
      isLayoutChildAbsolute: isAbsolute,
    };
    // `component` identity is enough — internal style changes trigger
    // re-renders at the SemanticInspector level via its own force-update hook.
  }, [component]);
}
