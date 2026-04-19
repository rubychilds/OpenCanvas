import type { Component } from "grapesjs";
import {
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartVertical,
  StretchHorizontal,
} from "../../canvas/chrome-icons.js";
import { clearStyle, readStyle, writeStyle } from "../../canvas/component-style.js";
import { InspectorSection } from "./InspectorSection.js";
import { NumberInput } from "../ui/number-input.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip.js";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group.js";

const ALIGN_SELF_OPTIONS = [
  { value: "flex-start", label: "Start", Icon: AlignStartVertical },
  { value: "center", label: "Center", Icon: AlignCenterVertical },
  { value: "flex-end", label: "End", Icon: AlignEndVertical },
  { value: "stretch", label: "Stretch", Icon: StretchHorizontal },
] as const;

/**
 * "Layout Item" — child-side flex properties. Per ADR-0003 this renders only
 * when the selected component's parent is a flex container (checked via
 * `useInspectorContext`). Controls: align-self · flex-grow · flex-shrink ·
 * flex-basis.
 */
export function LayoutItemSection({ component }: { component: Component }) {
  const alignSelf = readStyle(component, "align-self");
  const flexGrow = readStyle(component, "flex-grow");
  const flexShrink = readStyle(component, "flex-shrink");
  const flexBasis = readStyle(component, "flex-basis");

  return (
    <InspectorSection title="Layout Item">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground w-[44px] shrink-0">Align self</span>
        <ToggleGroup
          type="single"
          value={alignSelf}
          onValueChange={(v) => {
            if (!v) clearStyle(component, "align-self");
            else writeStyle(component, "align-self", v);
          }}
          data-testid="oc-ins-align-self"
        >
          {ALIGN_SELF_OPTIONS.map(({ value, label, Icon }) => (
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
        <NumberInput
          value={flexGrow}
          onChange={(n) => {
            if (n === 0) clearStyle(component, "flex-grow");
            else writeStyle(component, "flex-grow", String(n));
          }}
          min={0}
          step={1}
          label="G"
          data-testid="oc-ins-flex-grow"
        />
        <NumberInput
          value={flexShrink}
          onChange={(n) => {
            if (n === 1) clearStyle(component, "flex-shrink");
            else writeStyle(component, "flex-shrink", String(n));
          }}
          min={0}
          step={1}
          label="S"
          data-testid="oc-ins-flex-shrink"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground w-[44px] shrink-0">Basis</span>
        <NumberInput
          value={flexBasis}
          onChange={(n) => writeStyle(component, "flex-basis", `${n}px`)}
          unit="px"
          label="B"
          step={1}
          data-testid="oc-ins-flex-basis"
          className="flex-1"
        />
      </div>
    </InspectorSection>
  );
}
