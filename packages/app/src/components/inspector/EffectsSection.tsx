import * as React from "react";
import type { Component } from "grapesjs";
import { PlusOutline } from "../../canvas/chrome-icons.js";
import { cn } from "../../lib/utils.js";
import { clearStyle, readStyle, writeStyle } from "../../canvas/component-style.js";
import { FieldGroup, InspectorSection } from "./InspectorSection.js";
import { NumberInput } from "../ui/number-input.js";

/**
 * Effects — per ADR-0003 #9. First pass covers the two most-used filter
 * effects in modern UI: blur (layer blur) and backdrop-blur (translucent
 * containers). Other filter functions (brightness / contrast / saturate /
 * grayscale / drop-shadow / hue-rotate) remain reachable through Raw CSS
 * until demand appears.
 *
 * When no effect is applied the section body is empty — the user clicks the
 * + in the header to reveal the Blur / Bg blur inputs, at which point any
 * non-zero value keeps the section expanded across re-renders.
 */
export function EffectsSection({ component }: { component: Component }) {
  const filter = readStyle(component, "filter");
  const backdropFilter = readStyle(component, "backdrop-filter");

  const blur = parseFilterFunction(filter, "blur");
  const backdropBlur = parseFilterFunction(backdropFilter, "blur");
  const hasEffect = blur > 0 || backdropBlur > 0 || !!filter || !!backdropFilter;

  const [expanded, setExpanded] = React.useState(hasEffect);
  const lastComponentRef = React.useRef<Component>(component);
  React.useEffect(() => {
    // Re-derive expanded on selection change; otherwise let the local toggle
    // win so a user click-to-expand on an empty section doesn't immediately
    // collapse after the first style write lands.
    if (lastComponentRef.current !== component) {
      lastComponentRef.current = component;
      setExpanded(hasEffect);
    } else if (hasEffect && !expanded) {
      setExpanded(true);
    }
  }, [component, hasEffect, expanded]);

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

  const action = (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className={cn(
        "flex items-center justify-center h-5 w-5 rounded-sm transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-surface-sunken",
      )}
      aria-pressed={expanded}
      aria-label={expanded ? "Hide effects" : "Add effect"}
      data-testid="oc-ins-effects-toggle"
    >
      <PlusOutline className="size-4" />
    </button>
  );

  if (!expanded) {
    return <InspectorSection title="Effects" action={action}>{null}</InspectorSection>;
  }

  return (
    <InspectorSection title="Effects" action={action}>
      <FieldGroup label="Blur">
        <NumberInput
          value={blur}
          onChange={writeBlur}
          unit="px"
          label="B"
          min={0}
          step={1}
          data-testid="oc-ins-blur"
        />
      </FieldGroup>
      <FieldGroup label="Bg blur">
        <NumberInput
          value={backdropBlur}
          onChange={writeBackdropBlur}
          unit="px"
          label="B"
          min={0}
          step={1}
          data-testid="oc-ins-backdrop-blur"
        />
      </FieldGroup>
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
