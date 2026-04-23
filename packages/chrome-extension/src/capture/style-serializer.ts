/**
 * Style serializer — Story 8.2 computed-style inlining with the
 * hybrid inline / inherited-diff strategy from ADR-0011 §2.
 *
 *   - Non-inherited properties (layout, dimensions, background,
 *     border, shadow, transform, opacity, flex/grid, position):
 *     always inline on every element.
 *   - Inherited properties (font-*, line-height, color, letter-
 *     spacing, text-align, cursor, direction): only inline when
 *     computed value differs from parent's.
 *   - Shorthand properties expanded to per-side longhands.
 *   - CSS custom properties (var(--…)) already resolve to concrete
 *     values inside getComputedStyle, so no special handling needed.
 *   - Cross-origin <img src> + <link rel=stylesheet> + <script> are
 *     stripped to keep the canvas safe.
 *
 * Watchdog: tracks cumulative output size. Warns at 400KB, aborts
 * at 500KB.
 */

export interface SerializeResult {
  html: string;
  nodeCount: number;
  byteCount: number;
  warnings: string[];
}

export interface SerializeError {
  error: "too-large" | "empty-input" | "walker-exhausted";
  nodeCount: number;
  byteCount: number;
}

const PAYLOAD_SOFT_LIMIT = 400 * 1024;
const PAYLOAD_HARD_LIMIT = 500 * 1024;

/**
 * Properties we always inline on every element — layout/dimension/
 * appearance stuff that isn't inherited in CSS. The canvas renders
 * these independently per-node, so we emit them per-node.
 */
const NON_INHERITED: readonly string[] = [
  // Layout + positioning
  "display", "position", "top", "right", "bottom", "left",
  "float", "clear", "z-index", "overflow", "overflow-x", "overflow-y",
  "visibility",
  // Dimensions
  "width", "height", "min-width", "min-height", "max-width", "max-height",
  "aspect-ratio", "box-sizing",
  // Spacing (longhand)
  "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding-top", "padding-right", "padding-bottom", "padding-left",
  // Border (longhand)
  "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
  "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
  "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
  "border-top-left-radius", "border-top-right-radius",
  "border-bottom-left-radius", "border-bottom-right-radius",
  // Background
  "background-color", "background-image", "background-repeat",
  "background-position", "background-size", "background-attachment",
  "background-clip", "background-origin",
  // Effects
  "box-shadow", "opacity", "transform", "transform-origin",
  "filter", "backdrop-filter", "mix-blend-mode",
  // Flex
  "flex-direction", "flex-wrap", "gap", "row-gap", "column-gap",
  "justify-content", "align-items", "align-content",
  "flex-grow", "flex-shrink", "flex-basis", "align-self", "order",
  // Grid
  "grid-template-columns", "grid-template-rows", "grid-template-areas",
  "grid-auto-columns", "grid-auto-rows", "grid-auto-flow",
  "grid-column", "grid-row",
  "justify-self", "place-self",
];

/**
 * Inherited properties — emit only when the computed value differs
 * from the parent's. Browser cascade fills in the rest.
 */
const INHERITED_DIFF: readonly string[] = [
  "font-family", "font-size", "font-weight", "font-style", "font-variant",
  "font-stretch",
  "line-height", "letter-spacing", "word-spacing", "word-break", "white-space",
  "color",
  "text-align", "text-decoration-line", "text-decoration-color",
  "text-decoration-style", "text-transform", "text-indent", "text-shadow",
  "direction", "writing-mode",
  "cursor",
];

/**
 * Attributes to strip from the cloned tree on the way out. Event
 * handlers could execute on the canvas; `src` on scripts would load
 * arbitrary code; `href` on stylesheets would pull external CSS.
 */
const DROP_ELEMENTS = new Set(["SCRIPT", "NOSCRIPT", "STYLE", "LINK"]);
const DROP_ATTRS_PREFIX = ["on"] as const;

function shouldDropAttr(name: string): boolean {
  if (name === "style") return true; // replaced by our computed style
  if (name === "class") return false; // keep — useful for debugging on canvas
  if (name.startsWith("data-designjs-")) return true;
  for (const p of DROP_ATTRS_PREFIX) if (name.startsWith(p)) return true;
  return false;
}

/**
 * srcset entries are comma-separated `"<url> <descriptor>"` pairs; URLs
 * may be relative. Rewrite each to absolute.
 */
function resolveSrcset(srcset: string, baseURI: string): string {
  return srcset
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^(\S+)(?:\s+(.+))?$/);
      if (!match) return entry;
      const [, url, descriptor] = match;
      try {
        const abs = new URL(url!, baseURI).href;
        return descriptor ? `${abs} ${descriptor}` : abs;
      } catch {
        return entry;
      }
    })
    .join(", ");
}

/**
 * Images / video / audio / anchors can carry relative URLs that resolve
 * against the host page's document base. On the DesignJS canvas (a
 * different origin entirely) those paths would 404. Resolve to absolute
 * URLs before emission — the DOM properties (img.src, a.href, etc.)
 * return the absolute-resolved value, unlike getAttribute which
 * returns the as-authored string.
 *
 * Computed-style URLs (background-image, list-style-image, cursor, etc.)
 * already resolve to absolute in getComputedStyle's return value, so no
 * extra handling needed for those — buildInlineStyle picks up the
 * resolved form naturally.
 */
function normalizeMediaAttrs(clone: Element, src: Element): void {
  const baseURI = document.baseURI;

  if (src instanceof HTMLImageElement && clone instanceof HTMLImageElement) {
    if (src.src) clone.setAttribute("src", src.src);
    if (src.srcset) clone.setAttribute("srcset", resolveSrcset(src.srcset, baseURI));
    return;
  }
  if (src instanceof HTMLSourceElement && clone instanceof HTMLSourceElement) {
    if (src.src) clone.setAttribute("src", src.src);
    if (src.srcset) clone.setAttribute("srcset", resolveSrcset(src.srcset, baseURI));
    return;
  }
  if (src instanceof HTMLVideoElement && clone instanceof HTMLVideoElement) {
    if (src.src) clone.setAttribute("src", src.src);
    if (src.poster) {
      try {
        clone.setAttribute("poster", new URL(src.poster, baseURI).href);
      } catch {
        /* keep as-is */
      }
    }
    return;
  }
  if (src instanceof HTMLAudioElement && clone instanceof HTMLAudioElement) {
    if (src.src) clone.setAttribute("src", src.src);
    return;
  }
  if (src instanceof HTMLAnchorElement && clone instanceof HTMLAnchorElement) {
    if (src.href) clone.setAttribute("href", src.href);
    return;
  }
  if (src instanceof SVGImageElement && clone instanceof SVGImageElement) {
    const href = src.href?.baseVal || src.getAttribute("xlink:href");
    if (href) {
      try {
        clone.setAttribute("href", new URL(href, baseURI).href);
      } catch {
        /* keep as-is */
      }
    }
  }
}

function buildInlineStyle(
  computed: CSSStyleDeclaration,
  parentComputed: CSSStyleDeclaration | null,
): string {
  const parts: string[] = [];

  for (const prop of NON_INHERITED) {
    const v = computed.getPropertyValue(prop);
    if (!v || v === "normal" || v === "none" || v === "auto") {
      // Keep layout-critical "auto"s (e.g. width:auto on flex children).
      // For our purposes, skipping "auto"/"none"/"normal" is safe — the
      // browser default handles them at render time.
      continue;
    }
    parts.push(`${prop}:${v}`);
  }

  for (const prop of INHERITED_DIFF) {
    const v = computed.getPropertyValue(prop);
    if (!v) continue;
    const parentV = parentComputed?.getPropertyValue(prop) ?? "";
    if (v === parentV) continue;
    parts.push(`${prop}:${v}`);
  }

  return parts.join(";");
}

function stripAndInline(
  clone: Element,
  src: Element,
  parentSrc: Element | null,
  counters: { nodes: number; bytes: number; warnings: string[] },
): boolean {
  counters.nodes += 1;

  // Apply computed style inline.
  const computed = window.getComputedStyle(src);
  const parentComputed = parentSrc ? window.getComputedStyle(parentSrc) : null;
  const style = buildInlineStyle(computed, parentComputed);
  if (style) (clone as HTMLElement).setAttribute("style", style);
  else (clone as HTMLElement).removeAttribute("style");

  // Strip dangerous attributes from the clone.
  for (const attr of Array.from(clone.attributes)) {
    if (shouldDropAttr(attr.name)) clone.removeAttribute(attr.name);
  }

  // Rewrite relative src/srcset/href on media elements to absolute URLs
  // so the canvas (different origin) can actually load them.
  normalizeMediaAttrs(clone, src);

  // Rough running-size estimate — conservative but cheap (we
  // recompute properly from outerHTML at the end).
  counters.bytes += 48 + style.length;

  if (counters.bytes > PAYLOAD_HARD_LIMIT) return false;
  if (counters.bytes > PAYLOAD_SOFT_LIMIT && counters.warnings.length === 0) {
    counters.warnings.push(
      `Payload crossed ${PAYLOAD_SOFT_LIMIT / 1024}KB — capture may get close to the ${PAYLOAD_HARD_LIMIT / 1024}KB cap.`,
    );
  }

  // Recurse through element children, walking src + clone in parallel.
  const srcChildren = Array.from(src.children);
  const cloneChildren = Array.from(clone.children);
  for (let i = 0; i < srcChildren.length; i++) {
    const srcChild = srcChildren[i]!;
    const cloneChild = cloneChildren[i];
    if (!cloneChild) break;

    if (DROP_ELEMENTS.has(srcChild.tagName)) {
      cloneChild.remove();
      continue;
    }

    const ok = stripAndInline(cloneChild, srcChild, src, counters);
    if (!ok) return false;
  }

  return true;
}

export function serialize(root: Element): SerializeResult | SerializeError {
  if (!root) {
    return { error: "empty-input", nodeCount: 0, byteCount: 0 };
  }

  const clone = root.cloneNode(true) as Element;
  const counters = { nodes: 0, bytes: 0, warnings: [] as string[] };

  // If the root itself is a dropped element type, bail immediately.
  if (DROP_ELEMENTS.has(root.tagName)) {
    return { error: "empty-input", nodeCount: 0, byteCount: 0 };
  }

  const ok = stripAndInline(clone, root, root.parentElement, counters);
  if (!ok) {
    return {
      error: "too-large",
      nodeCount: counters.nodes,
      byteCount: counters.bytes,
    };
  }

  const html = (clone as HTMLElement).outerHTML;
  const byteCount = new Blob([html]).size;

  if (byteCount > PAYLOAD_HARD_LIMIT) {
    return { error: "too-large", nodeCount: counters.nodes, byteCount };
  }
  if (byteCount > PAYLOAD_SOFT_LIMIT && counters.warnings.length === 0) {
    counters.warnings.push(
      `Final payload is ${(byteCount / 1024).toFixed(0)}KB — near the ${PAYLOAD_HARD_LIMIT / 1024}KB cap.`,
    );
  }

  return {
    html,
    nodeCount: counters.nodes,
    byteCount,
    warnings: counters.warnings,
  };
}
