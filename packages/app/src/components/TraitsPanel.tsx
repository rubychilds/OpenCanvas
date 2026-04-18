import { TraitsProvider } from "@grapesjs/react";
import type { Trait } from "grapesjs";

function TraitRow({ trait }: { trait: Trait }) {
  const name = trait.getName?.() ?? trait.get("name");
  const label = trait.getLabel?.() ?? name;
  const value = (trait.getValue?.() ?? "") as string;
  const onChange = (v: string) => {
    (trait as unknown as { setValue: (v: string) => void }).setValue(v);
  };
  return (
    <label className="oc-traits__row">
      <span className="oc-traits__label">{label}</span>
      <input
        className="oc-traits__input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
          return <div className="oc-traits__empty">Select a component to edit traits</div>;
        }
        return (
          <div className="oc-traits">
            {traits.map((t) => (
              <TraitRow key={t.getId()} trait={t} />
            ))}
          </div>
        );
      }}
    </TraitsProvider>
  );
}
