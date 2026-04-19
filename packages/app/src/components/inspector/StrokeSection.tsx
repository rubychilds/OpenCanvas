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
 * Stroke section — colour, width, style (solid/dashed/dotted/double).
 * Writes the compound `border: <w> <style> <color>` shorthand when all three
 * are present; falls back to the split `border-width` / `border-style` /
 * `border-color` properties otherwise so partial state still round-trips.
 */
export function StrokeSection({ component }: { component: Component }) {
  // Read split properties first (most reliable); GrapesJS stores shorthand
  // as split props anyway after parsing.
  const widthRaw = readStyle(component, "border-width");
  const styleRaw = readStyle(component, "border-style");
  const colorRaw = readStyle(component, "border-color");

  const width = parseWidth(widthRaw);
  const style = normalizeStyle(styleRaw);
  const color = parseColor(colorRaw);
  const hasStroke = width > 0 || !!styleRaw || !!colorRaw;

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
            "h-(--row-height) flex-1 rounded-md border border-border bg-background px-2 text-sm",
            "focus:border-oc-accent focus:outline-none",
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
