import { useRef, useState } from "react";
import type { Component } from "grapesjs";
import {
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartVertical,
  LockSimple,
  LockSimpleOpen,
  Square,
  StretchHorizontal,
} from "../../canvas/chrome-icons.js";
import { cn } from "../../lib/utils.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip.js";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group.js";
import { NumberInput } from "../ui/number-input.js";
import {
  clearStyle,
  readStyle,
  rotationFromTransform,
  transformWithRotation,
  writeStyle,
} from "../../canvas/component-style.js";
import { FieldGroup, InspectorSection } from "./InspectorSection.js";
import { RotationDial } from "./controls/RotationDial.js";

/**
 * Measures section per ADR-0003. Owns W/H (with aspect-ratio lock), X/Y,
 * rotation (dial + numeric), and border-radius (single → per-corner toggle).
 * Per the implementing brief, align-items also lives here as the first row —
 * the Position/Measures slot in Penpot's shape includes alignment-of-self.
 */

function AlignItemsRow({ component }: { component: Component }) {
  const value = readStyle(component, "align-items");
  return (
    <FieldGroup label="Align">
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && writeStyle(component, "align-items", v)}
        data-testid="oc-ins-align-items"
      >
        {[
          { value: "flex-start", label: "Top", Icon: AlignStartVertical },
          { value: "center", label: "Middle", Icon: AlignCenterVertical },
          { value: "flex-end", label: "Bottom", Icon: AlignEndVertical },
          { value: "stretch", label: "Stretch", Icon: StretchHorizontal },
        ].map(({ value: v, label, Icon }) => (
          <Tooltip key={v}>
            <TooltipTrigger asChild>
              <ToggleGroupItem value={v} aria-label={label}>
                <Icon />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </FieldGroup>
  );
}

function WHRow({ component }: { component: Component }) {
  const width = readStyle(component, "width");
  const height = readStyle(component, "height");
  const widthNum = parsePx(width);
  const heightNum = parsePx(height);

  // Aspect-lock state lives in React only — not persisted to .opencanvas.json
  // per the brief. The captured ratio is the W:H at lock-engage time.
  const [locked, setLocked] = useState(false);
  const ratioRef = useRef<number | null>(null);

  const toggleLock = () => {
    if (!locked) {
      ratioRef.current = widthNum && heightNum ? widthNum / heightNum : 1;
    } else {
      ratioRef.current = null;
    }
    setLocked((prev) => !prev);
  };

  const onWChange = (n: number) => {
    writeStyle(component, "width", `${n}px`);
    if (locked && ratioRef.current && ratioRef.current > 0) {
      writeStyle(component, "height", `${Math.round(n / ratioRef.current)}px`);
    }
  };
  const onHChange = (n: number) => {
    writeStyle(component, "height", `${n}px`);
    if (locked && ratioRef.current && ratioRef.current > 0) {
      writeStyle(component, "width", `${Math.round(n * ratioRef.current)}px`);
    }
  };

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
      <NumberInput
        value={width}
        onChange={onWChange}
        unit="px"
        label="W"
        step={1}
        data-testid="oc-ins-width"
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleLock}
            aria-label={locked ? "Unlink width and height" : "Link width and height"}
            aria-pressed={locked}
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded-sm transition-colors",
              "hover:bg-surface-sunken",
              locked ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            data-testid="oc-ins-aspect-lock"
          >
            {locked ? (
              <LockSimple className="size-3.5" />
            ) : (
              <LockSimpleOpen className="size-3.5" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{locked ? "Aspect ratio locked" : "Lock aspect ratio"}</TooltipContent>
      </Tooltip>
      <NumberInput
        value={height}
        onChange={onHChange}
        unit="px"
        label="H"
        step={1}
        data-testid="oc-ins-height"
      />
    </div>
  );
}

function XYRow({ component }: { component: Component }) {
  const left = readStyle(component, "left");
  const top = readStyle(component, "top");
  const onChange = (prop: "left" | "top") => (n: number) => writeStyle(component, prop, `${n}px`);
  return (
    <div className="grid grid-cols-2 gap-1">
      <NumberInput
        value={left}
        onChange={onChange("left")}
        unit="px"
        label="X"
        step={1}
        data-testid="oc-ins-x"
      />
      <NumberInput
        value={top}
        onChange={onChange("top")}
        unit="px"
        label="Y"
        step={1}
        data-testid="oc-ins-y"
      />
    </div>
  );
}

function RotationRow({ component }: { component: Component }) {
  const transform = readStyle(component, "transform");
  const deg = rotationFromTransform(transform);
  const onChange = (n: number) => {
    const next = transformWithRotation(transform, n);
    if (!next) {
      clearStyle(component, "transform");
    } else {
      writeStyle(component, "transform", next);
    }
  };
  return (
    <FieldGroup label="Rotate">
      <RotationDial value={deg} onChange={onChange} data-testid="oc-ins-rotate" />
    </FieldGroup>
  );
}

const PER_CORNER_PROPS = [
  ["border-top-left-radius", "↖", "Top-left", "oc-ins-radius-tl"],
  ["border-top-right-radius", "↗", "Top-right", "oc-ins-radius-tr"],
  ["border-bottom-left-radius", "↙", "Bottom-left", "oc-ins-radius-bl"],
  ["border-bottom-right-radius", "↘", "Bottom-right", "oc-ins-radius-br"],
] as const;

function RadiusRow({ component }: { component: Component }) {
  // Per-corner mode is React-local UI state — not persisted. When the user
  // flips it on, we keep the existing values; per-corner edits clear the
  // border-radius shorthand to avoid contradictory CSS.
  const [perCorner, setPerCorner] = useState(false);

  const all = readStyle(component, "border-radius");
  const tl = readStyle(component, "border-top-left-radius");
  const tr = readStyle(component, "border-top-right-radius");
  const bl = readStyle(component, "border-bottom-left-radius");
  const br = readStyle(component, "border-bottom-right-radius");
  const allDisplay = all || tl || tr || br || bl;

  const setAll = (n: number) => {
    // Clear any per-corner overrides so the shorthand wins cleanly.
    clearStyle(component, "border-top-left-radius");
    clearStyle(component, "border-top-right-radius");
    clearStyle(component, "border-bottom-left-radius");
    clearStyle(component, "border-bottom-right-radius");
    if (n <= 0) clearStyle(component, "border-radius");
    else writeStyle(component, "border-radius", `${n}px`);
  };

  const setCorner = (prop: string) => (n: number) => {
    // Per-corner edits supersede the shorthand — clear it so the per-corner
    // values are the only declarations on the component.
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
                "hover:bg-surface-sunken",
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

export function MeasuresSection({ component }: { component: Component }) {
  return (
    <InspectorSection title="Measures">
      <AlignItemsRow component={component} />
      <WHRow component={component} />
      <XYRow component={component} />
      <RotationRow component={component} />
      <RadiusRow component={component} />
    </InspectorSection>
  );
}

function parsePx(raw: string): number | null {
  const m = /^(-?\d*\.?\d+)/.exec(raw.trim());
  if (!m) return null;
  const n = parseFloat(m[1]!);
  return Number.isFinite(n) ? n : null;
}
