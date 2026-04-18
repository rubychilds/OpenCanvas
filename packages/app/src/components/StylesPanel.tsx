import { StylesProvider } from "@grapesjs/react";
import type { Property, Sector } from "grapesjs";

function PropertyRow({ property }: { property: Property }) {
  const name = property.getName?.() ?? property.get("name") ?? property.getId();
  const propName = property.get("property") as string | undefined;
  const value = (property.getValue?.() ?? "") as string;
  const type = property.get("type") as string | undefined;

  const onChange = (v: string) => {
    (property as unknown as { upValue: (v: string) => void }).upValue(v);
  };

  if (type === "select" || type === "radio") {
    const options = (property.get("options") as Array<{ id?: string; label?: string }>) ?? [];
    return (
      <label className="oc-styles__row">
        <span className="oc-styles__label">{name}</span>
        <select
          className="oc-styles__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={`oc-style-${propName ?? name}`}
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

  return (
    <label className="oc-styles__row">
      <span className="oc-styles__label">{name}</span>
      <input
        type="text"
        className="oc-styles__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={`oc-style-${propName ?? name}`}
      />
    </label>
  );
}

function SectorView({ sector }: { sector: Sector }) {
  const props = sector.getProperties() as Property[];
  return (
    <section className="oc-styles__sector">
      <h3 className="oc-styles__sector-title">{sector.getName()}</h3>
      <div className="oc-styles__sector-body">
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
          return <div className="oc-styles__empty">Select a component to edit styles</div>;
        }
        return (
          <div className="oc-styles">
            {sectors.map((sector) => (
              <SectorView key={sector.getId()} sector={sector} />
            ))}
          </div>
        );
      }}
    </StylesProvider>
  );
}
