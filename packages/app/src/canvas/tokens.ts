/**
 * DTCG-shaped design-tokens store — ADR-0009 Phase 1 (foundation).
 *
 * Hybrid hierarchy per §1: storage is DTCG's natural nested-object shape
 * (e.g. `tokens.color.brand.primary`), but exposed via dot-paths so
 * callers don't traverse trees manually. Three-level UI projection
 * (Collection → Group → Variable) is a §9 concern; this module is data-
 * model only.
 *
 * Currently a parallel store alongside the legacy flat `variables.ts`.
 * `variables.ts` delegates here via `flattenToCssVariables` /
 * `inflateFromCssVariables` so the existing popover, MCP tools, and
 * persistence keep working unchanged through Phase 1. Phase 2 swaps the
 * MCP surface (§6) and Phase 3 swaps the popover (§9).
 */

/** DTCG primitive types shipping in v0.3 (ADR-0009 §2). */
export type DTCGType =
  | "color"
  | "dimension"
  | "number"
  | "duration"
  | "cubicBezier"
  | "fontFamily"
  | "fontWeight";

/**
 * DTCG token leaf. `$type` is optional in DTCG core but we always
 * inflate it on migration (§8), so once stored every token has one.
 */
export interface Token {
  $type?: DTCGType;
  $value: string | number | string[] | number[];
  $description?: string;
  $extensions?: Record<string, unknown>;
}

/**
 * Recursive tree — each key is either a nested group or a leaf Token.
 * Distinguished by presence of `$value` (DTCG's reserved-key convention).
 */
export type TokenTree = {
  [key: string]: TokenTree | Token;
};

export function isToken(node: unknown): node is Token {
  return (
    typeof node === "object" &&
    node !== null &&
    "$value" in (node as Record<string, unknown>)
  );
}

// ────────────────────────────────────────────────────────────────────
// Path operations — dot-paths into the tree (`color.brand.primary`)
// ────────────────────────────────────────────────────────────────────

export function getToken(tree: TokenTree, path: string): Token | null {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return null;
  let cursor: TokenTree | Token = tree;
  for (const part of parts) {
    if (isToken(cursor)) return null;
    const next: TokenTree | Token | undefined = (cursor as TokenTree)[part];
    if (next == null) return null;
    cursor = next;
  }
  return isToken(cursor) ? cursor : null;
}

export function setToken(tree: TokenTree, path: string, token: Token): void {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return;
  let cursor: TokenTree = tree;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const next = cursor[part];
    if (next == null || isToken(next)) {
      // Either no entry or a token-leaf is in the way. Either case, replace
      // with a fresh group — user-driven write wins. (Migration is
      // separate; collision detection lives in §5 emission, Chunk C.)
      const fresh: TokenTree = {};
      cursor[part] = fresh;
      cursor = fresh;
    } else {
      cursor = next;
    }
  }
  cursor[parts[parts.length - 1]!] = token;
}

export function deleteToken(tree: TokenTree, path: string): boolean {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return false;
  let cursor: TokenTree = tree;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const next = cursor[part];
    if (next == null || isToken(next)) return false;
    cursor = next;
  }
  const last = parts[parts.length - 1]!;
  if (!(last in cursor)) return false;
  delete cursor[last];
  return true;
}

/**
 * Walk every leaf Token in the tree, yielding `{ path, token }` pairs.
 * Path is the dot-joined key sequence. Order is the natural object
 * iteration order of the tree (insertion-order in modern JS engines).
 */
export function* walkTokens(
  tree: TokenTree,
  prefix = "",
): Generator<{ path: string; token: Token }> {
  for (const [key, node] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isToken(node)) {
      yield { path, token: node };
    } else {
      yield* walkTokens(node, path);
    }
  }
}

// ────────────────────────────────────────────────────────────────────
// CSS variable ↔ dot-path mapping
//
// `color.brand.primary` ↔ `--color-brand-primary`. Lossless in both
// directions assuming token-name segments don't contain `-` themselves
// (Tailwind v4 emission convention; collision detection in Chunk C
// catches the edge case where `color.brand.primary` and
// `color.brand-primary` both map to `--color-brand-primary`).
// ────────────────────────────────────────────────────────────────────

export function pathToCssVariable(path: string): string {
  return "--" + path.replace(/\./g, "-");
}

export function cssVariableToPath(cssVar: string): string {
  return cssVar.replace(/^--/, "").replace(/-/g, ".");
}

// ────────────────────────────────────────────────────────────────────
// Type validators per ADR-0009 §2
//
// Loose by design — match the bulk of valid CSS at a coarse level
// rather than parse it perfectly. Strict validation belongs at the
// Chunk C emission edge where invalid values would actually break.
// ────────────────────────────────────────────────────────────────────

const COLOR_PATTERNS = [
  /^#[0-9a-f]{3,8}$/i,
  /^rgba?\(/i,
  /^hsla?\(/i,
  /^oklch\(/i,
  /^oklab\(/i,
  /^lab\(/i,
  /^lch\(/i,
  /^color\(/i,
  /^hwb\(/i,
];

const COLOR_KEYWORDS = new Set([
  "transparent",
  "currentColor",
  "inherit",
  "initial",
  "unset",
]);

const DIMENSION_UNITS = [
  "px",
  "rem",
  "em",
  "%",
  "vh",
  "vw",
  "vmin",
  "vmax",
  "fr",
  "ch",
  "ex",
  "pt",
  "pc",
  "in",
  "cm",
  "mm",
  "Q",
  "svh",
  "svw",
  "lvh",
  "lvw",
  "dvh",
  "dvw",
];

const FONT_WEIGHT_KEYWORDS = new Set([
  "normal",
  "bold",
  "bolder",
  "lighter",
]);

export function validateValue(type: DTCGType, value: unknown): boolean {
  if (value == null) return false;

  switch (type) {
    case "color": {
      if (typeof value !== "string") return false;
      const trimmed = value.trim();
      if (COLOR_KEYWORDS.has(trimmed)) return true;
      return COLOR_PATTERNS.some((p) => p.test(trimmed));
    }
    case "dimension": {
      if (typeof value !== "string" && typeof value !== "number") return false;
      const s = String(value).trim();
      if (s === "0") return true;
      // Match `<number><unit>`. Number can be int, decimal, or negative.
      const m = /^(-?\d*\.?\d+)([a-zA-Z%]+)$/.exec(s);
      if (!m) return false;
      return DIMENSION_UNITS.includes(m[2]!);
    }
    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      return Number.isFinite(n);
    }
    case "duration": {
      if (typeof value !== "string") return false;
      return /^\d+(?:\.\d+)?(s|ms)$/i.test(value.trim());
    }
    case "cubicBezier": {
      if (Array.isArray(value)) {
        return (
          value.length === 4 && value.every((n) => typeof n === "number" && Number.isFinite(n))
        );
      }
      if (typeof value === "string") {
        return /^cubic-bezier\([^)]+\)$/i.test(value.trim());
      }
      return false;
    }
    case "fontFamily": {
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) {
        return value.every((s) => typeof s === "string" && s.trim().length > 0);
      }
      return false;
    }
    case "fontWeight": {
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(n) && n >= 1 && n <= 1000) return true;
      if (typeof value === "string" && FONT_WEIGHT_KEYWORDS.has(value.trim())) {
        return true;
      }
      return false;
    }
  }
}

// ────────────────────────────────────────────────────────────────────
// Migration from flat `cssVariables` (ADR-0009 §8)
//
// Conservative type inference: prefer key-based clues (`--color-*`,
// `--space-*`, `--font-weight-*`) over value-shape sniffing, since
// design-system naming conventions are usually intentional. Fall back
// to value-shape sniffing for the rest. Last resort: leave $type
// undefined (treat as opaque string).
// ────────────────────────────────────────────────────────────────────

const KEY_PREFIX_TO_TYPE: ReadonlyArray<readonly [RegExp, DTCGType]> = [
  [/^--color(?:-|$)/i, "color"],
  [/^--bg(?:-|$)/i, "color"],
  [/^--background(?:-|$)/i, "color"],
  [/^--fg(?:-|$)/i, "color"],
  [/^--foreground(?:-|$)/i, "color"],
  [/^--border(?:-|$)/i, "color"],
  [/^--ring(?:-|$)/i, "color"],
  [/^--accent(?:-|$)/i, "color"],
  [/^--muted(?:-|$)/i, "color"],
  [/^--space(?:-|$)/i, "dimension"],
  [/^--spacing(?:-|$)/i, "dimension"],
  [/^--padding(?:-|$)/i, "dimension"],
  [/^--margin(?:-|$)/i, "dimension"],
  [/^--gap(?:-|$)/i, "dimension"],
  [/^--radius(?:-|$)/i, "dimension"],
  [/^--size(?:-|$)/i, "dimension"],
  [/^--font-weight(?:-|$)/i, "fontWeight"],
  [/^--weight(?:-|$)/i, "fontWeight"],
  [/^--font-family(?:-|$)/i, "fontFamily"],
  [/^--font(?:-|$)/i, "fontFamily"],
  [/^--duration(?:-|$)/i, "duration"],
  [/^--ease(?:-|$)/i, "cubicBezier"],
  [/^--easing(?:-|$)/i, "cubicBezier"],
];

export function inferType(cssVar: string, value: string): DTCGType | undefined {
  // Key-based first.
  for (const [pattern, type] of KEY_PREFIX_TO_TYPE) {
    if (pattern.test(cssVar) && validateValue(type, value)) return type;
  }
  // Value-shape fallback in priority order.
  if (validateValue("color", value)) return "color";
  if (validateValue("dimension", value)) return "dimension";
  if (validateValue("duration", value)) return "duration";
  if (validateValue("cubicBezier", value)) return "cubicBezier";
  if (validateValue("fontWeight", value)) return "fontWeight";
  if (validateValue("number", value)) return "number";
  return undefined;
}

/**
 * Build a DTCG TokenTree from a flat `cssVariables` map. Keys are CSS
 * variable names (`--color-brand-primary`); paths are derived via
 * {@link cssVariableToPath}. Each value is wrapped in a Token with
 * an inferred `$type`.
 */
export function inflateFromCssVariables(
  flat: Record<string, string>,
): TokenTree {
  const tree: TokenTree = {};
  for (const [cssVar, value] of Object.entries(flat)) {
    const path = cssVariableToPath(cssVar);
    const type = inferType(cssVar, value);
    const token: Token = type ? { $type: type, $value: value } : { $value: value };
    setToken(tree, path, token);
  }
  return tree;
}

/**
 * Project a TokenTree back to the flat `Record<string, string>` shape
 * the legacy `variables.ts` API expects. Used by the legacy adapter so
 * existing consumers (popover, MCP `get_variables`, persistence
 * `getExtras`) keep working through Phase 1 unchanged.
 */
export function flattenToCssVariables(tree: TokenTree): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { path, token } of walkTokens(tree)) {
    out[pathToCssVariable(path)] = String(token.$value);
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────
// Module-level mutable store
// ────────────────────────────────────────────────────────────────────

let store: TokenTree = {};

export function getTokenTree(): TokenTree {
  return store;
}

export function loadTokenTree(tree: TokenTree): void {
  store = tree;
}

export function resetTokenStore(): void {
  store = {};
}
