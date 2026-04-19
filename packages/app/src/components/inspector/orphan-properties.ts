import type { Component } from "grapesjs";

/**
 * CSS properties the semantic inspector owns. Anything a selected component
 * has a style for that is NOT in this set is "orphan" — the Raw CSS section
 * shows it as an escape hatch. After Phases 1-3 this set covers the common
 * design-tool vocabulary (position, layout, sizing, typography, fill,
 * stroke, effects); only genuine long-tail CSS (mask, transitions,
 * animations, object-fit, etc.) survives into Raw CSS.
 */
const SEMANTIC_PROPS: ReadonlySet<string> = new Set([
  // Position
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "transform",
  "align-items",
  // Layout (flex + grid + sizing + padding + margin + overflow)
  "display",
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "flex-direction",
  "flex-wrap",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  "align-self",
  "justify-content",
  "gap",
  "row-gap",
  "column-gap",
  "grid-template-columns",
  "grid-template-rows",
  "grid-column",
  "grid-row",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "overflow",
  "overflow-x",
  "overflow-y",
  // Appearance
  "opacity",
  "mix-blend-mode",
  "border-radius",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "cursor",
  "z-index",
  // Typography
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "text-align",
  "text-transform",
  "font-variant-caps",
  "font-variant",
  "text-decoration",
  // Fill
  "color",
  "background-color",
  "background-image",
  // Stroke
  "border",
  "border-width",
  "border-style",
  "border-color",
  // Effects
  "box-shadow",
  "filter",
  "backdrop-filter",
]);

/**
 * Returns true when the component has at least one CSS property set that
 * the semantic inspector sections don't own. When false, Raw CSS has nothing
 * to offer and its section should not render.
 */
export function hasOrphanProperties(component: Component): boolean {
  const styles =
    (component as unknown as { getStyle?: () => Record<string, unknown> }).getStyle?.() ??
    {};
  for (const key of Object.keys(styles)) {
    const raw = styles[key];
    // Skip empty-string values — GrapesJS can hold the key with a cleared
    // value after a `removeStyle` in some versions.
    if (raw === "" || raw == null) continue;
    if (!SEMANTIC_PROPS.has(key)) return true;
  }
  return false;
}
