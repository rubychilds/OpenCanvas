import { useEffect, useState } from "react";
import { useEditorMaybe } from "@grapesjs/react";
import type { Component } from "grapesjs";
import {
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceAround,
  AlignHorizontalSpaceBetween,
  AlignStartVertical,
  ArrowDown,
  ArrowRight,
  Maximize,
  Move,
  StretchHorizontal,
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
import {
  clearStyle,
  readStyle,
  rotationFromTransform,
  transformWithRotation,
  writeStyle,
} from "../../canvas/component-style.js";
import { StylesPanel } from "../StylesPanel.js";
import { InspectorSection } from "./InspectorSection.js";
import { LayerSection } from "./LayerSection.js";
import { LayoutItemSection } from "./LayoutItemSection.js";
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

function AlignItemsRow({ component }: { component: Component }) {
  const value = readStyle(component, "align-items");
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground w-[44px] shrink-0">Align</span>
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
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground w-[44px] shrink-0">Rotate</span>
      <NumberInput
        value={deg}
        onChange={onChange}
        unit="°"
        label="°"
        min={-360}
        max={360}
        step={1}
        data-testid="oc-ins-rotate"
        className="flex-1"
      />
    </div>
  );
}

function PositionSection({ component }: { component: Component }) {
  return (
    <InspectorSection title="Position">
      <AlignItemsRow component={component} />
      <XYRow component={component} />
      <RotationRow component={component} />
    </InspectorSection>
  );
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

  const toggleControl = (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-1.5 px-1.5 h-5 rounded-sm text-[11px] transition-colors",
        enabled
          ? "bg-oc-accent text-oc-accent-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-surface-sunken",
      )}
      aria-pressed={enabled}
      data-testid="oc-ins-autolayout-toggle"
    >
      {enabled ? "On" : "Off"}
    </button>
  );

  return (
    <InspectorSection title="Auto Layout" action={toggleControl}>
      {enabled ? (
        <>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground w-[44px] shrink-0">Direction</span>
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
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground w-[44px] shrink-0">Gap</span>
            <NumberInput
              value={gap}
              onChange={(n) => writeStyle(component, "gap", `${n}px`)}
              unit="px"
              label="↔"
              min={0}
              step={1}
              data-testid="oc-ins-gap"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground w-[44px] shrink-0">Justify</span>
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
          </div>
        </>
      ) : (
        <p className="text-[11px] text-muted-foreground py-1">
          Turn on to arrange children with direction + gap + justify.
        </p>
      )}
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
      <PositionSection component={selected} />
      {context.isLayoutChild ? <LayoutItemSection component={selected} /> : null}
      <AutoLayoutSection component={selected} />
      <FrameSection component={selected} />
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
