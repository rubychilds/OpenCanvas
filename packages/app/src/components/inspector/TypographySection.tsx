import type { Component } from "grapesjs";
import {
  CaseLower,
  CaseSensitive,
  CaseUpper,
  TextAlignCenter,
  TextAlignJustify,
  TextAlignLeft,
  TextAlignRight,
  TextStrikethrough,
  TextTSlash,
  TextUnderline,
} from "../../canvas/chrome-icons.js";
import { cn } from "../../lib/utils.js";
import { clearStyle, readStyle, writeStyle } from "../../canvas/component-style.js";
import { FieldGroup, InspectorSection } from "./InspectorSection.js";
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

const TEXT_TRANSFORM_OPTIONS = [
  { value: "none", label: "None", Icon: null as null | typeof CaseUpper, glyph: "–" },
  { value: "capitalize", label: "Capitalize", Icon: CaseSensitive, glyph: null },
  { value: "lowercase", label: "Lowercase", Icon: CaseLower, glyph: null },
  { value: "uppercase", label: "Uppercase", Icon: CaseUpper, glyph: null },
] as const;

const TEXT_DECORATION_OPTIONS = [
  { value: "none", label: "None", Icon: TextTSlash },
  { value: "underline", label: "Underline", Icon: TextUnderline },
  { value: "line-through", label: "Strikethrough", Icon: TextStrikethrough },
] as const;

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
      {/* Font family + weight live on one row — Font label dropped, the two
          selects are self-evident (weight is 3-digit numeric, family is a
          name). Family takes the extra width; weight stays compact at ~72px. */}
      <div className="flex items-center gap-1">
        <select
          value={matchPreset(fontFamily)}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) clearStyle(component, "font-family");
            else writeStyle(component, "font-family", v);
          }}
          className={cn(
            "h-7 flex-1 min-w-0 rounded-md bg-chip px-2 text-sm text-foreground",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-oc-accent",
          )}
          data-testid="oc-ins-font-family"
          aria-label="Font family"
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
        <select
          value={fontWeight}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "400") clearStyle(component, "font-weight");
            else writeStyle(component, "font-weight", v);
          }}
          className={cn(
            "h-7 w-16 shrink-0 rounded-md bg-chip px-2 text-sm text-foreground tabular-nums",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-oc-accent",
          )}
          data-testid="oc-ins-font-weight"
          aria-label="Font weight"
        >
          {WEIGHT_OPTIONS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>

      {/* Size stands alone; LH + LS ride together on the next row. */}
      <NumberInput
        value={fontSize}
        onChange={(n) => writeStyle(component, "font-size", `${n}px`)}
        unit="px"
        label="S"
        min={1}
        step={1}
        data-testid="oc-ins-font-size"
      />

      <div className="grid grid-cols-2 gap-1">
        <NumberInput
          value={lineHeight}
          onChange={(n) => writeStyle(component, "line-height", String(n))}
          label="LH"
          min={0}
          step={0.1}
          data-testid="oc-ins-line-height"
        />
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
        />
      </div>

      <FieldGroup label="Align">
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
      </FieldGroup>

      <FieldGroup label="Case">
        <ToggleGroup
          type="single"
          value={textTransform}
          onValueChange={(v) => {
            if (!v || v === "none") clearStyle(component, "text-transform");
            else writeStyle(component, "text-transform", v);
          }}
          data-testid="oc-ins-text-transform"
        >
          {TEXT_TRANSFORM_OPTIONS.map(({ value, label, Icon, glyph }) => (
            <Tooltip key={value}>
              <TooltipTrigger asChild>
                <ToggleGroupItem value={value} aria-label={label}>
                  {Icon ? (
                    <Icon className="size-3.5" />
                  ) : (
                    <span className="text-[11px] font-semibold tabular-nums">{glyph}</span>
                  )}
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </ToggleGroup>
      </FieldGroup>

      <FieldGroup label="Deco">
        <ToggleGroup
          type="single"
          value={textDecoration}
          onValueChange={(v) => {
            if (!v || v === "none") clearStyle(component, "text-decoration");
            else writeStyle(component, "text-decoration", v);
          }}
          data-testid="oc-ins-text-decoration"
        >
          {TEXT_DECORATION_OPTIONS.map(({ value, label, Icon }) => (
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
      </FieldGroup>
    </InspectorSection>
  );
}

function matchPreset(value: string): string {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  const match = FONT_FAMILY_PRESETS.find((p) => p.value === normalized);
  return match ? match.value : value;
}
