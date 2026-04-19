import { useState } from "react";
import type { Component } from "grapesjs";
import { Square } from "../../canvas/chrome-icons.js";
import { cn } from "../../lib/utils.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip.js";
import { NumberInput } from "../ui/number-input.js";
import { clearStyle, readStyle, writeStyle } from "../../canvas/component-style.js";
import { FieldGroup, InspectorSection } from "./InspectorSection.js";

const BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
] as const;

const PER_CORNER_PROPS = [
  ["border-top-left-radius", "↖", "Top-left", "oc-ins-radius-tl"],
  ["border-top-right-radius", "↗", "Top-right", "oc-ins-radius-tr"],
  ["border-bottom-left-radius", "↙", "Bottom-left", "oc-ins-radius-bl"],
  ["border-bottom-right-radius", "↘", "Bottom-right", "oc-ins-radius-br"],
] as const;

const CURSOR_OPTIONS = [
  "auto",
  "default",
  "pointer",
  "text",
  "crosshair",
  "grab",
  "grabbing",
  "move",
  "not-allowed",
  "wait",
  "help",
  "zoom-in",
  "zoom-out",
] as const;

/**
 * Appearance — opacity, border radius, blend mode, cursor, z-index. Collapses
 * what was the Layer section's opacity/blend controls with the Radius row
 * from the former MeasuresSection, per user direction ("appearance (opacity,
 * border radius)"). Visibility + lock live on the layer tree rows now, not
 * in the inspector. Cursor + z-index live here because they're per-element
 * visual/interaction state with no other obvious home.
 */
export function AppearanceSection({ component }: { component: Component }) {
  return (
    <InspectorSection title="Appearance">
      <OpacityRow component={component} />
      <RadiusRow component={component} />
      <BlendRow component={component} />
      <CursorRow component={component} />
      <ZIndexRow component={component} />
    </InspectorSection>
  );
}

function CursorRow({ component }: { component: Component }) {
  const cursor = readStyle(component, "cursor") || "auto";
  return (
    <FieldGroup label="Cursor">
      <select
        value={cursor}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "auto") clearStyle(component, "cursor");
          else writeStyle(component, "cursor", v);
        }}
        className={cn(
          "h-7 w-full rounded-md bg-chip px-2 text-sm text-foreground",
          "focus:outline-none focus-visible:ring-1 focus-visible:ring-oc-accent",
        )}
        data-testid="oc-ins-cursor"
        aria-label="Cursor"
      >
        {CURSOR_OPTIONS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </FieldGroup>
  );
}

function ZIndexRow({ component }: { component: Component }) {
  const raw = readStyle(component, "z-index");
  const value = raw === "" || raw === "auto" ? 0 : parseInt(raw, 10) || 0;
  return (
    <FieldGroup label="Stack order">
      <NumberInput
        value={value}
        onChange={(n) => {
          if (n === 0) clearStyle(component, "z-index");
          else writeStyle(component, "z-index", String(Math.round(n)));
        }}
        step={1}
        label="Z"
        data-testid="oc-ins-z-index"
      />
    </FieldGroup>
  );
}

function OpacityRow({ component }: { component: Component }) {
  const raw = readStyle(component, "opacity");
  const opacity =
    raw === "" ? 100 : Math.round(Math.max(0, Math.min(1, parseFloat(raw))) * 100);
  return (
    <NumberInput
      value={opacity}
      onChange={(n) => {
        const v = Math.max(0, Math.min(100, Math.round(n)));
        if (v >= 100) clearStyle(component, "opacity");
        else writeStyle(component, "opacity", String(v / 100));
      }}
      min={0}
      max={100}
      step={1}
      unit="%"
      label="%"
      data-testid="oc-ins-layer-opacity"
    />
  );
}

function RadiusRow({ component }: { component: Component }) {
  const [perCorner, setPerCorner] = useState(false);

  const all = readStyle(component, "border-radius");
  const tl = readStyle(component, "border-top-left-radius");
  const tr = readStyle(component, "border-top-right-radius");
  const bl = readStyle(component, "border-bottom-left-radius");
  const br = readStyle(component, "border-bottom-right-radius");
  const allDisplay = all || tl || tr || br || bl;

  const setAll = (n: number) => {
    clearStyle(component, "border-top-left-radius");
    clearStyle(component, "border-top-right-radius");
    clearStyle(component, "border-bottom-left-radius");
    clearStyle(component, "border-bottom-right-radius");
    if (n <= 0) clearStyle(component, "border-radius");
    else writeStyle(component, "border-radius", `${n}px`);
  };

  const setCorner = (prop: string) => (n: number) => {
    clearStyle(component, "border-radius");
    if (n <= 0) clearStyle(component, prop);
    else writeStyle(component, prop, `${n}px`);
  };

  return (
    <FieldGroup label="Radius">
      <div className="flex items-center gap-1">
        {perCorner ? (
          <span className="flex-1 text-[11px] text-muted-foreground">Per corner</span>
        ) : (
          <NumberInput
            value={allDisplay}
            onChange={setAll}
            unit="px"
            label="R"
            min={0}
            step={1}
            data-testid="oc-ins-radius-all"
            className="flex-1"
          />
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setPerCorner((v) => !v)}
              aria-label={perCorner ? "Single radius" : "Per-corner radius"}
              aria-pressed={perCorner}
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-sm transition-colors",
                "hover:bg-background",
                perCorner ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              data-testid="oc-ins-radius-mode"
            >
              <Square className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {perCorner ? "Switch to single radius" : "Switch to per-corner radius"}
          </TooltipContent>
        </Tooltip>
      </div>
      {perCorner ? (
        <div className="grid grid-cols-2 gap-1">
          {PER_CORNER_PROPS.map(([prop, glyph, label, testid]) => (
            <NumberInput
              key={prop}
              value={readStyle(component, prop)}
              onChange={setCorner(prop)}
              unit="px"
              label={glyph}
              min={0}
              step={1}
              aria-label={label}
              data-testid={testid}
            />
          ))}
        </div>
      ) : null}
    </FieldGroup>
  );
}

function BlendRow({ component }: { component: Component }) {
  const blendMode = readStyle(component, "mix-blend-mode") || "normal";
  return (
    <FieldGroup label="Blend">
      <select
        value={blendMode}
        onChange={(e) => {
          if (e.target.value === "normal") clearStyle(component, "mix-blend-mode");
          else writeStyle(component, "mix-blend-mode", e.target.value);
        }}
        className={cn(
          "h-7 w-full rounded-md bg-chip px-2 text-sm text-foreground",
          "focus:outline-none focus-visible:ring-1 focus-visible:ring-oc-accent",
        )}
        data-testid="oc-ins-layer-blend-mode"
        aria-label="Blend"
      >
        {BLEND_MODES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </FieldGroup>
  );
}
