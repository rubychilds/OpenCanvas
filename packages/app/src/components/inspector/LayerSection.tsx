import type { Component } from "grapesjs";
import { Eye, EyeOff, Lock, LockOpen } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { clearStyle, readStyle, writeStyle } from "../../canvas/component-style.js";
import { InspectorSection } from "./InspectorSection.js";
import { NumberInput } from "../ui/number-input.js";

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

function isLocked(component: Component): boolean {
  const a = (component as unknown as { getAttributes?: () => Record<string, unknown> }).getAttributes?.() ?? {};
  return a["data-oc-locked"] === "true";
}

function setLocked(component: Component, locked: boolean): void {
  const get = (component as unknown as { getAttributes?: () => Record<string, unknown> }).getAttributes;
  const set = (component as unknown as { setAttributes?: (a: Record<string, unknown>) => void }).setAttributes;
  if (typeof set !== "function") return;
  const current = typeof get === "function" ? get.call(component) : {};
  const next: Record<string, unknown> = { ...current };
  if (locked) next["data-oc-locked"] = "true";
  else delete next["data-oc-locked"];
  set.call(component, next);
}

/**
 * First section of the semantic inspector — owns layer-state affordances
 * (visibility / lock / opacity / blend-mode). Per Penpot convention, these
 * live at the top, not buried in Raw CSS.
 */
export function LayerSection({ component }: { component: Component }) {
  const hidden = readStyle(component, "display") === "none";
  const locked = isLocked(component);
  const opacityRaw = readStyle(component, "opacity");
  const opacity =
    opacityRaw === "" ? 100 : Math.round(Math.max(0, Math.min(1, parseFloat(opacityRaw))) * 100);
  const blendMode = readStyle(component, "mix-blend-mode") || "normal";

  return (
    <InspectorSection title="Layer">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={cn(
            "flex items-center justify-center h-6 w-6 rounded-sm transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-surface-sunken",
            hidden && "text-foreground",
          )}
          aria-label={hidden ? "Show layer" : "Hide layer"}
          title={hidden ? "Show" : "Hide"}
          onClick={() => {
            if (hidden) clearStyle(component, "display");
            else writeStyle(component, "display", "none");
          }}
          data-testid="oc-ins-layer-visibility"
        >
          {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
        <button
          type="button"
          className={cn(
            "flex items-center justify-center h-6 w-6 rounded-sm transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-surface-sunken",
            locked && "text-foreground",
          )}
          aria-label={locked ? "Unlock layer" : "Lock layer"}
          title={locked ? "Unlock" : "Lock"}
          onClick={() => setLocked(component, !locked)}
          data-testid="oc-ins-layer-lock"
        >
          {locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
        </button>

        <div className="flex-1 ml-2">
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
        </div>
      </div>

      <label className="flex items-center gap-2 py-0.5">
        <span className="text-[11px] text-muted-foreground w-[44px] shrink-0">Blend</span>
        <select
          value={blendMode}
          onChange={(e) => {
            if (e.target.value === "normal") clearStyle(component, "mix-blend-mode");
            else writeStyle(component, "mix-blend-mode", e.target.value);
          }}
          className={cn(
            "h-(--row-height) flex-1 rounded-md border border-border bg-background px-2 text-sm",
            "focus:border-oc-accent focus:outline-none",
          )}
          data-testid="oc-ins-layer-blend-mode"
        >
          {BLEND_MODES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
    </InspectorSection>
  );
}
