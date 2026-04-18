import { TraitsProvider } from "@grapesjs/react";
import type { Trait } from "grapesjs";
import { cn } from "../lib/utils.js";

function TraitRow({ trait }: { trait: Trait }) {
  const name = trait.getName?.() ?? trait.get("name");
  const label = trait.getLabel?.() ?? name;
  const value = (trait.getValue?.() ?? "") as string;
  const onChange = (v: string) => {
    (trait as unknown as { setValue: (v: string) => void }).setValue(v);
  };
  return (
    <label className="grid grid-cols-[80px_1fr] items-center gap-2 py-0.5">
      <span className="text-xs text-muted-foreground truncate" title={String(label)}>
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-7 w-full rounded-md border border-border bg-background px-2 text-sm",
          "focus:border-oc-accent focus:outline-none",
        )}
        data-testid={`oc-trait-${name}`}
      />
    </label>
  );
}

export function TraitsPanel() {
  return (
    <TraitsProvider>
      {({ traits }) => {
        if (traits.length === 0) {
          return (
            <div className="p-2 text-xs text-muted-foreground">
              Select a component to edit traits.
            </div>
          );
        }
        return (
          <div className="flex flex-col">
            {traits.map((t) => (
              <TraitRow key={t.getId()} trait={t} />
            ))}
          </div>
        );
      }}
    </TraitsProvider>
  );
}
