/**
 * Colour parsing / formatting shared across Fill / Stroke / Shadow sections.
 * The inspector works in terms of `{ hex: "#rrggbb", opacity: 0..1 }`; CSS
 * values round-trip to/from `rgb(...)` / `rgba(...)` / `#rgb` / `#rrggbb` /
 * `#rrggbbaa`.
 */

export interface NormalizedColor {
  hex: string;
  opacity: number;
}

const DEFAULT: NormalizedColor = { hex: "#000000", opacity: 1 };

export function hexToRgb(hex: string): [number, number, number] | null {
  const m3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
  if (m3) {
    return [
      parseInt(m3[1]! + m3[1]!, 16),
      parseInt(m3[2]! + m3[2]!, 16),
      parseInt(m3[3]! + m3[3]!, 16),
    ];
  }
  const m6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (m6) {
    return [parseInt(m6[1]!, 16), parseInt(m6[2]!, 16), parseInt(m6[3]!, 16)];
  }
  return null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
      .toLowerCase()
  );
}

/**
 * Parse a CSS colour into normalised { hex, opacity }. Returns DEFAULT when the
 * input is unparseable so sections can still render a swatch.
 */
export function parseColor(input: string): NormalizedColor {
  const s = (input || "").trim().toLowerCase();
  if (!s || s === "transparent") return DEFAULT;

  if (s.startsWith("#")) {
    const m8 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(s);
    if (m8) {
      return {
        hex: `#${m8[1]}${m8[2]}${m8[3]}`,
        opacity: parseInt(m8[4]!, 16) / 255,
      };
    }
    const rgb = hexToRgb(s);
    if (rgb) return { hex: rgbToHex(rgb[0], rgb[1], rgb[2]), opacity: 1 };
    return DEFAULT;
  }

  const rgba = /^rgba?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*(?:,\s*(-?\d+(?:\.\d+)?)\s*)?\)$/.exec(
    s,
  );
  if (rgba) {
    const r = parseFloat(rgba[1]!);
    const g = parseFloat(rgba[2]!);
    const b = parseFloat(rgba[3]!);
    const a = rgba[4] === undefined ? 1 : parseFloat(rgba[4]);
    return { hex: rgbToHex(r, g, b), opacity: Math.max(0, Math.min(1, a)) };
  }

  return DEFAULT;
}

/**
 * Emit a CSS colour. When opacity < 1, emits `rgba(...)`; otherwise `#rrggbb`.
 * The reader accepts both forms so this choice is free.
 */
export function formatColor(hex: string, opacity = 1): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  if (opacity >= 1) return rgbToHex(rgb[0], rgb[1], rgb[2]);
  const clamped = Math.max(0, Math.min(1, opacity));
  // Round to 3 decimals to keep the CSS short and stable.
  const a = Math.round(clamped * 1000) / 1000;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
}

/**
 * Split a comma-separated CSS value while respecting nested parentheses so
 * `linear-gradient(rgb(0,0,0), rgb(1,1,1))` survives as one token.
 */
export function splitTopLevel(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      out.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = value.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}
