import type { Component } from "grapesjs";

/**
 * Which sector *names* (matching the names in `STYLE_MANAGER_CONFIG`) should be
 * visible for a given tagName. Undefined tag or one we haven't mapped falls
 * back to showing every sector (safe default — never hide something the user
 * might legitimately need).
 */
const SECTORS_BY_TAG: Record<string, ReadonlySet<string>> = {
  // Inline text gets typography + decoration only; no layout box model.
  span: new Set(["Typography", "Fill"]),
  a: new Set(["Typography", "Fill"]),
  strong: new Set(["Typography"]),
  em: new Set(["Typography"]),
  small: new Set(["Typography"]),
  code: new Set(["Typography", "Fill"]),

  // Block-level text: typography + size/spacing, no flex container controls.
  p: new Set(["Typography", "Size & spacing", "Fill"]),
  h1: new Set(["Typography", "Size & spacing", "Fill"]),
  h2: new Set(["Typography", "Size & spacing", "Fill"]),
  h3: new Set(["Typography", "Size & spacing", "Fill"]),
  h4: new Set(["Typography", "Size & spacing", "Fill"]),
  h5: new Set(["Typography", "Size & spacing", "Fill"]),
  h6: new Set(["Typography", "Size & spacing", "Fill"]),
  label: new Set(["Typography", "Size & spacing", "Fill"]),

  // Media: sized + decorated, no typography, no flex container.
  img: new Set(["Size & spacing", "Fill"]),
  video: new Set(["Size & spacing", "Fill"]),

  // Form inputs: sized, typed (for the input font), decorated.
  input: new Set(["Size & spacing", "Typography", "Fill"]),
  textarea: new Set(["Size & spacing", "Typography", "Fill"]),
  select: new Set(["Size & spacing", "Typography", "Fill"]),
  button: new Set(["Size & spacing", "Typography", "Fill", "Layout"]),
};

/**
 * Return true when a given sector name should be shown for the selected
 * component. `null` selection (nothing selected) shows everything — the style
 * manager is already empty in that case anyway.
 */
export function isSectorVisibleFor(
  sectorName: string,
  selected: Component | null,
): boolean {
  if (!selected) return true;
  const tag = String(selected.get("tagName") ?? "").toLowerCase();
  if (!tag) return true;
  const allow = SECTORS_BY_TAG[tag];
  if (!allow) return true;
  return allow.has(sectorName);
}
