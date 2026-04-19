import type { Component } from "grapesjs";
import { clearStyle, readStyle, writeStyle } from "../../canvas/component-style.js";
import { InspectorSection } from "./InspectorSection.js";
import { NumberInput } from "../ui/number-input.js";

/**
 * Effects — per ADR-0003 #9. First pass covers the two most-used filter
 * effects in modern UI: blur (layer blur) and backdrop-blur (translucent
 * containers). Other filter functions (brightness / contrast / saturate /
 * grayscale / drop-shadow / hue-rotate) remain reachable through Raw CSS
 * until demand appears.
 */
export function EffectsSection({ component }: { component: Component }) {
  const filter = readStyle(component, "filter");
  const backdropFilter = readStyle(component, "backdrop-filter");

  const blur = parseFilterFunction(filter, "blur");
  const backdropBlur = parseFilterFunction(backdropFilter, "blur");

  const writeBlur = (n: number) => {
    const next = replaceFilterFunction(filter, "blur", n, "px");
    if (!next) clearStyle(component, "filter");
    else writeStyle(component, "filter", next);
  };

  const writeBackdropBlur = (n: number) => {
    const next = replaceFilterFunction(backdropFilter, "blur", n, "px");
    if (!next) clearStyle(component, "backdrop-filter");
    else writeStyle(component, "backdrop-filter", next);
  };

  return (
    <InspectorSection title="Effects">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground w-[44px] shrink-0">Blur</span>
        <NumberInput
          value={blur}
          onChange={writeBlur}
          unit="px"
          label="B"
          min={0}
          step={1}
          data-testid="oc-ins-blur"
          className="flex-1"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground w-[44px] shrink-0">Bg blur</span>
        <NumberInput
          value={backdropBlur}
          onChange={writeBackdropBlur}
          unit="px"
          label="B"
          min={0}
          step={1}
          data-testid="oc-ins-backdrop-blur"
          className="flex-1"
        />
      </div>
    </InspectorSection>
  );
}

function parseFilterFunction(filter: string, fn: string): number {
  if (!filter) return 0;
  const re = new RegExp(`${fn}\\(([\\d.]+)(?:px|rem|em)?\\)`, "i");
  const match = re.exec(filter);
  return match ? parseFloat(match[1]!) : 0;
}

function replaceFilterFunction(
  existing: string,
  fn: string,
  value: number,
  unit: string,
): string {
  const stripRe = new RegExp(`${fn}\\([^)]+\\)`, "gi");
  const base = (existing || "").replace(stripRe, "").replace(/\s+/g, " ").trim();
  if (value === 0) return base;
  return base ? `${base} ${fn}(${value}${unit})` : `${fn}(${value}${unit})`;
}
