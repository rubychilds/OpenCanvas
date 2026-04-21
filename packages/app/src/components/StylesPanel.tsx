import { useEffect, useState } from "react";
import { StylesProvider, useEditorMaybe } from "@grapesjs/react";
import type { Component, Property, Sector } from "grapesjs";
import { cn } from "../lib/utils.js";
import { NumberInput } from "./ui/number-input.js";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion.js";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip.js";
import { optionsForProperty } from "../canvas/alignment-icons.js";
import { isSectorVisibleFor } from "../canvas/style-filters.js";
import { usePersistedState } from "../hooks/usePersistedState.js";

interface PropertyOption {
  id?: string;
  label?: string;
}

function upValue(property: Property, value: string): void {
  (property as unknown as { upValue: (v: string) => void }).upValue(value);
}

function PropertyRow({ property }: { property: Property }) {
  const name = property.getName?.() ?? property.get("name") ?? property.getId();
  const propName = property.get("property") as string | undefined;
  const testId = `oc-style-${propName ?? name}`;
  const value = (property.getValue?.() ?? "") as string;
  const type = property.get("type") as string | undefined;
  const units = property.get("units") as string[] | undefined;

  const label = (
    <span className="text-xs text-muted-foreground truncate" title={name}>
      {name}
    </span>
  );

  // Icon ToggleGroup for alignment-shaped properties.
  const iconOptions = propName ? optionsForProperty(propName) : null;
  if (iconOptions) {
    return (
      <label className="grid grid-cols-[80px_1fr] items-center gap-2 py-0.5">
        {label}
        <ToggleGroup
          type="single"
          value={value}
          onValueChange={(v) => {
            if (v) upValue(property, v);
          }}
          data-testid={testId}
        >
          {iconOptions.map(({ value: val, label: optLabel, Icon }) => (
            <Tooltip key={val}>
              <TooltipTrigger asChild>
                <ToggleGroupItem
                  value={val}
                  aria-label={optLabel}
                  data-testid={`${testId}-${val}`}
                >
                  <Icon />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>{optLabel}</TooltipContent>
            </Tooltip>
          ))}
        </ToggleGroup>
      </label>
    );
  }

  if (type === "select" || type === "radio") {
    const options = (property.get("options") as PropertyOption[]) ?? [];
    return (
      <label className="grid grid-cols-[80px_1fr] items-center gap-2 py-0.5">
        {label}
        <select
          value={value}
          onChange={(e) => upValue(property, e.target.value)}
          className={cn(
            "h-(--row-height) w-full rounded-md border border-border bg-background px-2 text-sm",
            "focus:border-oc-accent focus:outline-none",
          )}
          data-testid={testId}
        >
          {options.map((opt) => (
            <option key={opt.id ?? ""} value={opt.id ?? ""}>
              {opt.label ?? opt.id}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (type === "integer" || type === "number") {
    const unit = units && units.length > 0 ? (units[0] ?? "") : "";
    return (
      <label className="grid grid-cols-[80px_1fr] items-center gap-2 py-0.5">
        {label}
        <NumberInput
          value={value}
          onChange={(n) => upValue(property, `${n}${unit}`)}
          unit={unit || undefined}
          step={1}
          data-testid={testId}
        />
      </label>
    );
  }

  return (
    <label className="grid grid-cols-[80px_1fr] items-center gap-2 py-0.5">
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => upValue(property, e.target.value)}
        className={cn(
          "h-(--row-height-comfy) w-full rounded-md border border-border bg-background px-2 text-sm",
          "focus:border-oc-accent focus:outline-none",
        )}
        data-testid={testId}
      />
    </label>
  );
}

function useSelectedComponent(): Component | null {
  const editor = useEditorMaybe();
  const [selected, setSelected] = useState<Component | null>(null);
  useEffect(() => {
    if (!editor) return;
    const update = () => setSelected(editor.getSelected() ?? null);
    update();
    editor.on("component:selected component:deselected", update);
    // When this panel mounts late (e.g. lazy inside the Accordion's Raw CSS
    // fallback), StylesProvider has already missed the initial custom event.
    // Re-fire it so sectors land.
    (editor.Styles as unknown as { __trgCustom?: () => void }).__trgCustom?.();
    return () => {
      editor.off("component:selected component:deselected", update);
    };
  }, [editor]);
  return selected;
}

export function StylesPanel() {
  // Open-by-default sectors; overwritten from localStorage per usePersistedState.
  const [openSectors, setOpenSectors] = usePersistedState<string[]>(
    "designjs:styles:open-sectors",
    ["Layout"],
  );
  const selected = useSelectedComponent();

  return (
    <StylesProvider>
      {({ sectors }) => {
        if (sectors.length === 0) {
          return (
            <div className="p-2 text-xs text-muted-foreground">
              Select a component to edit styles.
            </div>
          );
        }

        const visibleSectors: Sector[] = sectors.filter((s) => isSectorVisibleFor(s.getName(), selected));

        return (
          <Accordion
            type="multiple"
            value={openSectors}
            onValueChange={(v) => setOpenSectors(v as string[])}
            className="-mx-2"
          >
            {visibleSectors.map((sector) => {
              const props = sector.getProperties() as Property[];
              return (
                <AccordionItem key={sector.getId()} value={sector.getName()}>
                  <AccordionTrigger data-testid={`oc-sector-${sector.getName()}`}>
                    {sector.getName()}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col">
                      {props.map((p) => (
                        <PropertyRow key={p.getId()} property={p} />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        );
      }}
    </StylesProvider>
  );
}
