import { useEffect, useState } from "react";
import { useEditorMaybe } from "@grapesjs/react";
import type { Component } from "grapesjs";
import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceAround,
  AlignHorizontalSpaceBetween,
  ArrowDown,
  ArrowRight,
  Maximize,
  Minus,
  Move,
  PlusOutline,
  Unplug,
} from "../../canvas/chrome-icons.js";
import { cn } from "../../lib/utils.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip.js";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group.js";
import { NumberInput } from "../ui/number-input.js";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion.js";
import { clearStyle, readStyle, writeStyle } from "../../canvas/component-style.js";
import { StylesPanel } from "../StylesPanel.js";
import { EffectsSection } from "./EffectsSection.js";
import { ExportsSection } from "./ExportsSection.js";
import { FieldGroup, InspectorSection } from "./InspectorSection.js";
import { LayerSection } from "./LayerSection.js";
import { LayoutItemSection } from "./LayoutItemSection.js";
import { FillSection } from "./FillSection.js";
import { MeasuresSection } from "./MeasuresSection.js";
import { ShadowSection } from "./ShadowSection.js";
import { StrokeSection } from "./StrokeSection.js";
import { TypographySection, isTypographyTarget } from "./TypographySection.js";
import { useInspectorContext } from "./useInspectorContext.js";

/** Sections the inspector offers (per ADR-0002 direction). */

function useSelectedComponent(): Component | null {
  const editor = useEditorMaybe();
  const [selected, setSelected] = useState<Component | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const update = () => setSelected(editor.getSelected() ?? null);
    update();
    editor.on("component:selected component:deselected", update);
    // Re-render on any style change so NumberInput values stay in sync with the
    // model.
    editor.on("component:styleUpdate component:update:style", () => force((n) => n + 1));
    return () => {
      editor.off("component:selected component:deselected", update);
    };
  }, [editor]);

  return selected;
}

const DIRECTION_OPTIONS = [
  { value: "row", label: "Horizontal", Icon: ArrowRight },
  { value: "column", label: "Vertical", Icon: ArrowDown },
  { value: "free", label: "Free form", Icon: Move },
] as const;

const JUSTIFY_OPTIONS = [
  { value: "flex-start", label: "Start", Icon: AlignHorizontalJustifyStart },
  { value: "center", label: "Center", Icon: AlignHorizontalJustifyCenter },
  { value: "flex-end", label: "End", Icon: AlignHorizontalJustifyEnd },
  { value: "space-between", label: "Space between", Icon: AlignHorizontalSpaceBetween },
  { value: "space-around", label: "Space around", Icon: AlignHorizontalSpaceAround },
] as const;

function AutoLayoutSection({ component }: { component: Component }) {
  const display = readStyle(component, "display");
  const enabled = display === "flex";

  const toggle = () => {
    if (enabled) {
      clearStyle(component, "display");
    } else {
      writeStyle(component, "display", "flex");
    }
  };

  const direction = readStyle(component, "flex-direction") || "row";
  const gap = readStyle(component, "gap");
  const justify = readStyle(component, "justify-content");

  // Penpot-shape action: outlined + when off (enable auto-layout), outlined −
  // when on (remove it). Replaces the earlier On/Off text pill.
  const toggleControl = (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "flex items-center justify-center h-5 w-5 rounded-sm transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-surface-sunken",
          )}
          aria-pressed={enabled}
          aria-label={enabled ? "Remove auto layout" : "Add auto layout"}
          data-testid="oc-ins-autolayout-toggle"
        >
          {enabled ? <Minus className="size-3.5" /> : <PlusOutline className="size-3.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>{enabled ? "Remove auto layout" : "Add auto layout"}</TooltipContent>
    </Tooltip>
  );

  // When auto layout is off the section body is empty — the + in the header
  // is the only affordance needed.
  if (!enabled) {
    return <InspectorSection title="Auto Layout" action={toggleControl}>{null}</InspectorSection>;
  }

  return (
    <InspectorSection title="Auto Layout" action={toggleControl}>
      <FieldGroup label="Direction">
        <ToggleGroup
          type="single"
          value={direction === "free" ? "" : direction}
          onValueChange={(v) => {
            if (!v) return;
            if (v === "free") {
              clearStyle(component, "flex-direction");
            } else {
              writeStyle(component, "flex-direction", v);
            }
          }}
          data-testid="oc-ins-flex-direction"
        >
          {DIRECTION_OPTIONS.map(({ value: val, label, Icon }) => (
            <Tooltip key={val}>
              <TooltipTrigger asChild>
                <ToggleGroupItem value={val} aria-label={label}>
                  <Icon />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </ToggleGroup>
      </FieldGroup>
      <FieldGroup label="Gap">
        <NumberInput
          value={gap}
          onChange={(n) => writeStyle(component, "gap", `${n}px`)}
          unit="px"
          label="↔"
          min={0}
          step={1}
          data-testid="oc-ins-gap"
        />
      </FieldGroup>
      <FieldGroup label="Justify">
        <ToggleGroup
          type="single"
          value={justify}
          onValueChange={(v) => v && writeStyle(component, "justify-content", v)}
          data-testid="oc-ins-justify"
        >
          {JUSTIFY_OPTIONS.map(({ value: val, label, Icon }) => (
            <Tooltip key={val}>
              <TooltipTrigger asChild>
                <ToggleGroupItem value={val} aria-label={label}>
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

function FrameSection({ component }: { component: Component }) {
  const overflow = readStyle(component, "overflow");
  const clipped = overflow === "hidden";

  return (
    <InspectorSection title="Frame">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="accent-oc-accent"
          checked={clipped}
          onChange={(e) => {
            if (e.target.checked) {
              writeStyle(component, "overflow", "hidden");
            } else {
              clearStyle(component, "overflow");
            }
          }}
          data-testid="oc-ins-clip"
        />
        <Maximize className="size-3 text-muted-foreground" aria-hidden />
        <span className="text-[11px]">Clip content</span>
      </label>
    </InspectorSection>
  );
}

function DetachHint({ component }: { component: Component }) {
  // Tiny placeholder for the Figma "detach instance" corner affordance — shows
  // when a component is (or will be) a registered Code Connect component.
  // Today it only renders when a component has the `data-oc-instance` attr,
  // which nothing sets yet; kept as a home for the behaviour once it lands.
  const attrs = (component as unknown as { getAttributes?: () => Record<string, unknown> }).getAttributes?.() ?? {};
  if (!attrs["data-oc-instance"]) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="p-1 rounded-sm hover:bg-surface-sunken">
          <Unplug className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>Detach instance</TooltipContent>
    </Tooltip>
  );
}

export function SemanticInspector() {
  const selected = useSelectedComponent();
  const context = useInspectorContext(selected);

  if (!selected) {
    return (
      <div className="p-(--panel-padding) text-xs text-muted-foreground">
        Select a component to edit.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-(--panel-padding) h-(--section-title-height) border-b border-border">
        <span className="text-xs text-muted-foreground truncate">
          {selected.getName?.() ?? selected.get("tagName") ?? "Selected"}
        </span>
        <DetachHint component={selected} />
      </div>
      <LayerSection component={selected} />
      <MeasuresSection component={selected} />
      {context.isLayoutChild ? <LayoutItemSection component={selected} /> : null}
      <AutoLayoutSection component={selected} />
      <FrameSection component={selected} />
      <FillSection component={selected} />
      <StrokeSection component={selected} />
      <ShadowSection component={selected} />
      <EffectsSection component={selected} />
      {isTypographyTarget(selected) ? <TypographySection component={selected} /> : null}
      <ExportsSection component={selected} />
      <Accordion type="single" collapsible className="border-t border-border">
        <AccordionItem value="raw-css" className="border-b-0">
          <AccordionTrigger data-testid="oc-ins-raw-css-trigger">Raw CSS</AccordionTrigger>
          <AccordionContent>
            <StylesPanel />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
