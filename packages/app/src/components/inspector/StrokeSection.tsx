import type { Component } from "grapesjs";
import { cn } from "../../lib/utils.js";
import { clearStyle, readStyle, writeStyle } from "../../canvas/component-style.js";
import { InspectorSection } from "./InspectorSection.js";
import { NumberInput } from "../ui/number-input.js";
import { ColorField } from "./controls/ColorField.js";
import { formatColor, parseColor } from "./controls/color-utils.js";

const STYLES = ["solid", "dashed", "dotted", "double"] as const;
type StrokeStyle = (typeof STYLES)[number];

function parseWidth(input: string): number {
  if (!input) return 0;
  const m = /^(-?\d+(?:\.\d+)?)/.exec(input.trim());
  return m ? parseFloat(m[1]!) : 0;
}

function normalizeStyle(input: string): StrokeStyle {
  const s = input.trim() as StrokeStyle;
  return (STYLES as readonly string[]).includes(s) ? s : "solid";
}

/**
 * Parse a `border` shorthand like `2px dashed rgba(255, 0, 0, 0.5)` into the
 * same shape the split properties expose. Tokens inside parens (rgba) survive
 * as one unit. Missing tokens come back empty.
 */
function parseShorthand(input: string): { width: string; style: string; color: string } {
  const s = input.trim();
  if (!s) return { width: "", style: "", color: "" };
  const tokens: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (depth === 0 && /\s/.test(ch)) {
      const t = s.slice(start, i).trim();
      if (t) tokens.push(t);
      start = i + 1;
    }
  }
  const tail = s.slice(start).trim();
  if (tail) tokens.push(tail);

  let width = "";
  let style = "";
  let color = "";
  for (const t of tokens) {
    if (!width && /^-?\d+(?:\.\d+)?(px|rem|em)?$/.test(t)) width = t;
    else if (!style && (STYLES as readonly string[]).includes(t)) style = t;
    else color = color ? `${color} ${t}` : t;
  }
  return { width, style, color };
}

/**
 * Stroke section — colour, width, style (solid/dashed/dotted/double).
 * Writes the compound `border: <w> <style> <color>` shorthand when all three
 * are present; falls back to the split `border-width` / `border-style` /
 * `border-color` properties otherwise so partial state still round-trips.
 */
export function StrokeSection({ component }: { component: Component }) {
  // GrapesJS keeps whichever form the writer used; prefer the shorthand
  // `border` when present so our own output round-trips cleanly, then fall
  // back to the split properties for partial state or external edits.
  const shorthand = readStyle(component, "border");
  const split = shorthand
    ? parseShorthand(shorthand)
    : {
        width: readStyle(component, "border-width"),
        style: readStyle(component, "border-style"),
        color: readStyle(component, "border-color"),
      };

  const width = parseWidth(split.width);
  const style = normalizeStyle(split.style);
  const color = parseColor(split.color);
  const hasStroke = width > 0 || !!split.style || !!split.color;

  const writeAll = (w: number, s: StrokeStyle, hex: string, op: number) => {
    if (w <= 0 && !hasStroke) {
      clearStyle(component, "border");
      clearStyle(component, "border-width");
      clearStyle(component, "border-style");
      clearStyle(component, "border-color");
      return;
    }
    const effW = Math.max(0, w);
    // Use shorthand when fully specified — tidier CSS, matches Figma/Penpot output.
    const cssColor = formatColor(hex, op);
    if (effW > 0) {
      writeStyle(component, "border", `${effW}px ${s} ${cssColor}`);
      // Clear split props so readers don't see conflicting values.
      clearStyle(component, "border-width");
      clearStyle(component, "border-style");
      clearStyle(component, "border-color");
    } else {
      clearStyle(component, "border");
      writeStyle(component, "border-style", s);
      writeStyle(component, "border-color", cssColor);
      clearStyle(component, "border-width");
    }
  };

  return (
    <InspectorSection title="Stroke">
      <div className="flex items-center gap-1">
        <ColorField
          value={color.hex}
          onChange={(hex) => writeAll(width || 1, style, hex, color.opacity)}
          data-testid="oc-ins-stroke-color"
          className="flex-1"
        />
        <div className="w-[52px] shrink-0">
          <NumberInput
            value={width}
            onChange={(n) => writeAll(n, style, color.hex, color.opacity)}
            min={0}
            step={1}
            unit="px"
            label="W"
            data-testid="oc-ins-stroke-width"
          />
        </div>
      </div>
      <label className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground w-[44px] shrink-0">Style</span>
        <select
          value={style}
          onChange={(e) =>
            writeAll(width || 1, e.target.value as StrokeStyle, color.hex, color.opacity)
          }
          className={cn(
            "h-7 flex-1 rounded-md bg-chip px-2 text-sm text-foreground",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-oc-accent",
          )}
          data-testid="oc-ins-stroke-style"
        >
          {STYLES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
    </InspectorSection>
  );
}
