import { StylesProvider } from "@grapesjs/react";
import type { Property, Sector } from "grapesjs";
import { cn } from "../lib/utils.js";
import { NumberInput } from "./ui/number-input.js";

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

  const commonLabel = (
    <span className="text-xs text-muted-foreground truncate" title={name}>
      {name}
    </span>
  );

  if (type === "select" || type === "radio") {
    const options = (property.get("options") as PropertyOption[]) ?? [];
    return (
      <label className="grid grid-cols-[80px_1fr] items-center gap-2 py-0.5">
        {commonLabel}
        <select
          value={value}
          onChange={(e) => upValue(property, e.target.value)}
          className={cn(
            "h-7 w-full rounded-md border border-border bg-background px-2 text-sm",
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
        {commonLabel}
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
      {commonLabel}
      <input
        type="text"
        value={value}
        onChange={(e) => upValue(property, e.target.value)}
        className={cn(
          "h-7 w-full rounded-md border border-border bg-background px-2 text-sm",
          "focus:border-oc-accent focus:outline-none",
        )}
        data-testid={testId}
      />
    </label>
  );
}

function SectorView({ sector }: { sector: Sector }) {
  const props = sector.getProperties() as Property[];
  return (
    <section className="flex flex-col gap-1 pb-3 mb-3 border-b border-border last:border-0 last:pb-0 last:mb-0">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground px-0.5">
        {sector.getName()}
      </h3>
      <div className="flex flex-col">
        {props.map((p) => (
          <PropertyRow key={p.getId()} property={p} />
        ))}
      </div>
    </section>
  );
}

export function StylesPanel() {
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
        return (
          <div className="flex flex-col">
            {sectors.map((sector) => (
              <SectorView key={sector.getId()} sector={sector} />
            ))}
          </div>
        );
      }}
    </StylesProvider>
  );
}
