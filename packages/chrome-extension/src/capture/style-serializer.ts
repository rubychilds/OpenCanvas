/**
 * Style serializer — Story 8.2 computed-style inlining with the
 * hybrid inline / inherited-diff strategy from ADR-0011 §2.
 *
 * Walks a subtree from `root`, emits HTML with inline styles:
 *
 *   - Non-inherited properties (layout, dimensions, background,
 *     border, shadow, transform, opacity, z-index, flex/grid,
 *     position) always inline on every element.
 *   - Inherited properties (font-family, font-size, line-height,
 *     color, letter-spacing, text-align, cursor, direction) only
 *     inline when the computed value differs from the parent's.
 *   - Shorthand properties expanded to longhand per side.
 *   - CSS custom properties (var(--…)) resolved to their computed
 *     concrete value at capture time; origin names discarded.
 *
 * Watchdog: tracks cumulative payload size; warns at 400KB, aborts
 * at 500KB with `{ error: "too large", nodeCount, byteCount }`.
 */

export interface SerializeResult {
  html: string;
  nodeCount: number;
  byteCount: number;
  warnings: string[];
}

export interface SerializeError {
  error: "too-large" | "walker-exhausted";
  nodeCount: number;
  byteCount: number;
}

const PAYLOAD_SOFT_LIMIT = 400 * 1024;
const PAYLOAD_HARD_LIMIT = 500 * 1024;

export function serialize(root: Element): SerializeResult | SerializeError {
  // TODO: implement per ADR-0011 §2.
  // - Non-inherited property set — maintain as a const array.
  // - Inherited property set — checked against parent via Window.getComputedStyle.
  // - Shorthand expansion — margin/padding/border-radius/border-*/inset/flex/grid/background/transition.
  // - CSS var resolution — getComputedStyle already resolves var()s; just read the resolved string.
  // - Payload watchdog — byte counter accumulating across the walk.
  void PAYLOAD_SOFT_LIMIT;
  void PAYLOAD_HARD_LIMIT;
  void root;

  return {
    html: "",
    nodeCount: 0,
    byteCount: 0,
    warnings: ["style-serializer: not implemented"],
  };
}
