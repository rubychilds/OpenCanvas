import type { ReactNode } from "react";
import type { Component } from "grapesjs";
import {
  TextAlignCenter,
  TextAlignJustify,
  TextAlignLeft,
  TextAlignRight,
} from "../../canvas/chrome-icons.js";
import { cn } from "../../lib/utils.js";
import { clearStyle, readStyle, writeStyle } from "../../canvas/component-style.js";
import { InspectorSection } from "./InspectorSection.js";
import { NumberInput } from "../ui/number-input.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip.js";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group.js";

const TEXT_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "span",
  "a",
  "strong",
  "em",
  "small",
  "code",
  "label",
  "button",
  "li",
  "blockquote",
]);

export function isTypographyTarget(component: Component): boolean {
  const tag = String(component.get?.("tagName") ?? "").toLowerCase();
  return TEXT_TAGS.has(tag);
}

const FONT_FAMILY_PRESETS = [
  { label: "System sans", value: "system-ui, sans-serif" },
  { label: "System serif", value: "ui-serif, Georgia, serif" },
  { label: "System mono", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
] as const;

const WEIGHT_OPTIONS = [
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
] as const;

const TEXT_ALIGN_OPTIONS = [
  { value: "left", label: "Left", Icon: TextAlignLeft },
  { value: "center", label: "Center", Icon: TextAlignCenter },
  { value: "right", label: "Right", Icon: TextAlignRight },
  { value: "justify", label: "Justify", Icon: TextAlignJustify },
] as const;

const TEXT_TRANSFORM_OPTIONS = ["none", "uppercase", "lowercase", "capitalize"] as const;
const TEXT_DECORATION_OPTIONS = ["none", "underline", "line-through", "overline"] as const;

function RowLabel({ children }: { children: ReactNode }) {
  return <span className="text-[11px] text-muted-foreground w-[44px] shrink-0">{children}</span>;
}

export function TypographySection({ component }: { component: Component }) {
  const fontFamily = readStyle(component, "font-family");
  const fontWeight = readStyle(component, "font-weight") || "400";
  const fontSize = readStyle(component, "font-size");
  const lineHeight = readStyle(component, "line-height");
  const letterSpacing = readStyle(component, "letter-spacing");
  const textAlign = readStyle(component, "text-align");
  const textTransform = readStyle(component, "text-transform") || "none";
  const textDecoration = readStyle(component, "text-decoration") || "none";

  return (
    <InspectorSection title="Typography">
      <div className="flex items-center gap-2">
        <RowLabel>Font</RowLabel>
        <select
          value={matchPreset(fontFamily)}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) clearStyle(component, "font-family");
            else writeStyle(component, "font-family", v);
          }}
          className={cn(
            "h-7 flex-1 rounded-md bg-chip px-2 text-sm text-foreground",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-oc-accent",
          )}
          data-testid="oc-ins-font-family"
        >
          <option value="">Inherit</option>
          {FONT_FAMILY_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
          {fontFamily && !FONT_FAMILY_PRESETS.some((p) => p.value === fontFamily) ? (
            <option value={fontFamily}>{fontFamily}</option>
          ) : null}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <RowLabel>Weight</RowLabel>
        <select
          value={fontWeight}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "400") clearStyle(component, "font-weight");
            else writeStyle(component, "font-weight", v);
          }}
          className={cn(
            "h-7 flex-1 rounded-md bg-chip px-2 text-sm text-foreground",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-oc-accent",
          )}
          data-testid="oc-ins-font-weight"
        >
          {WEIGHT_OPTIONS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-1">
        <NumberInput
          value={fontSize}
          onChange={(n) => writeStyle(component, "font-size", `${n}px`)}
          unit="px"
          label="S"
          min={1}
          step={1}
          data-testid="oc-ins-font-size"
        />
        <NumberInput
          value={lineHeight}
          onChange={(n) => writeStyle(component, "line-height", String(n))}
          label="LH"
          min={0}
          step={0.1}
          data-testid="oc-ins-line-height"
        />
      </div>

      <div className="flex items-center gap-2">
        <RowLabel>Spacing</RowLabel>
        <NumberInput
          value={letterSpacing}
          onChange={(n) => {
            if (n === 0) clearStyle(component, "letter-spacing");
            else writeStyle(component, "letter-spacing", `${n}px`);
          }}
          unit="px"
          label="LS"
          step={0.5}
          data-testid="oc-ins-letter-spacing"
          className="flex-1"
        />
      </div>

      <div className="flex items-center gap-2">
        <RowLabel>Align</RowLabel>
        <ToggleGroup
          type="single"
          value={textAlign}
          onValueChange={(v) => {
            if (!v) clearStyle(component, "text-align");
            else writeStyle(component, "text-align", v);
          }}
          data-testid="oc-ins-text-align"
        >
          {TEXT_ALIGN_OPTIONS.map(({ value, label, Icon }) => (
            <Tooltip key={value}>
              <TooltipTrigger asChild>
                <ToggleGroupItem value={value} aria-label={label}>
                  <Icon />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </ToggleGroup>
      </div>

      <div className="grid grid-cols-2 gap-1">
        <label className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground">Case</span>
          <select
            value={textTransform}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "none") clearStyle(component, "text-transform");
              else writeStyle(component, "text-transform", v);
            }}
            className={cn(
              "h-7 flex-1 rounded-md bg-chip px-1 text-xs text-foreground",
              "focus:outline-none focus-visible:ring-1 focus-visible:ring-oc-accent",
            )}
            data-testid="oc-ins-text-transform"
          >
            {TEXT_TRANSFORM_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground">Deco</span>
          <select
            value={textDecoration}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "none") clearStyle(component, "text-decoration");
              else writeStyle(component, "text-decoration", v);
            }}
            className={cn(
              "h-7 flex-1 rounded-md bg-chip px-1 text-xs text-foreground",
              "focus:outline-none focus-visible:ring-1 focus-visible:ring-oc-accent",
            )}
            data-testid="oc-ins-text-decoration"
          >
            {TEXT_DECORATION_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      </div>
    </InspectorSection>
  );
}

function matchPreset(value: string): string {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  const match = FONT_FAMILY_PRESETS.find((p) => p.value === normalized);
  return match ? match.value : value;
}
