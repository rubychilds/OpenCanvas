import type { EditorConfig } from "grapesjs";
import { DEFAULT_BLOCKS } from "./blocks.js";
import { STYLE_MANAGER_CONFIG } from "./style-sectors.js";

const TAILWIND_V4_CDN = "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4";

/**
 * CSS applied to every canvas frame (new AND previously-saved). Handles
 * primitives' default sizing in a way that doesn't depend on the Tailwind
 * browser CDN having already scanned the iframe DOM — on fast canvas edits
 * the CDN can lag a tick, leaving newly-inserted elements un-styled for
 * long enough to cause visible meltdowns.
 *
 * Text primitives default to Figma/Penpot "point-text" behaviour:
 *   - `display: inline-block` so the box sizes to its content
 *   - `white-space: nowrap` so it never wraps one-glyph-per-line when the
 *     parent layout reports zero width (which happens mid-mount and
 *     again when GrapesJS flips the element to contenteditable during
 *     double-click-to-edit).
 *   - `min-width: 1ch` so an empty text box still carries a caret slot.
 *
 * `!important` on `display` and `white-space` because GrapesJS's RTE
 * writes a few inline styles of its own when it takes over the element
 * for editing, and without the override those win and the <p> snaps
 * back to a block box whose children can wrap vertically.
 *
 * User-authored styles (via the inspector) still win for `width`, `height`,
 * and properties that aren't forced here — so resizing a text box into a
 * wrapping paragraph still works once the user explicitly opts in.
 */
/*
 * `:not([style*="width"])` = "the user hasn't set an inline width on this
 * element yet." While that selector matches, we force the box to shrink-
 * wrap its content so the selection overlay actually tracks the visible
 * glyphs. Once the user writes a width via the inspector (inline style
 * like `width: 500px`), the :not() flips off and their value takes over —
 * so switching from point-text to a wrapping paragraph still works.
 *
 * Separately, `display: inline-block` and `white-space: nowrap` are
 * !important unconditionally: GrapesJS's RTE injects its own inline
 * styles when it takes the element over for editing, and without the
 * override it'd snap the box back to block and let glyphs stack.
 */
const PRIMITIVE_BASE_CSS = `
[data-oc-shape="text"] {
  display: inline-block !important;
  white-space: nowrap !important;
  min-width: 1ch;
}
[data-oc-shape="text"]:not([style*="width"]) {
  width: max-content !important;
}
`;

const PRIMITIVE_BASE_CSS_DATA_URL = `data:text/css;charset=utf-8,${encodeURIComponent(PRIMITIVE_BASE_CSS)}`;

export const editorOptions: EditorConfig = {
  height: "100%",
  width: "auto",
  storageManager: false,
  canvas: {
    scripts: [TAILWIND_V4_CDN],
    styles: [PRIMITIVE_BASE_CSS_DATA_URL],
    // Spatial, pannable/zoomable canvas that hosts multiple artboard frames
    // at their own world-coordinates (x/y/width/height per addFrame call).
    // Flagged experimental in GrapesJS 0.22 but is load-bearing for Epic 5.
    infiniteCanvas: true,
  },
  blockManager: {
    blocks: DEFAULT_BLOCKS,
    custom: true,
  },
  styleManager: {
    ...STYLE_MANAGER_CONFIG,
    custom: true,
  },
  layerManager: {
    custom: true,
  },
  traitManager: {
    custom: true,
  },
  panels: { defaults: [] },
};
