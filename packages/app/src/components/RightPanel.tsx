import { useState } from "react";
import { StylesPanel } from "./StylesPanel.js";
import { TraitsPanel } from "./TraitsPanel.js";

type Tab = "styles" | "traits";

export function RightPanel() {
  const [tab, setTab] = useState<Tab>("styles");
  return (
    <aside className="oc-panel">
      <div className="oc-panel__tabs">
        <button
          type="button"
          className={`oc-panel__tab${tab === "styles" ? " oc-panel__tab--active" : ""}`}
          onClick={() => setTab("styles")}
        >
          Styles
        </button>
        <button
          type="button"
          className={`oc-panel__tab${tab === "traits" ? " oc-panel__tab--active" : ""}`}
          onClick={() => setTab("traits")}
        >
          Traits
        </button>
      </div>
      <div className="oc-panel__body">
        <div style={{ display: tab === "styles" ? "block" : "none" }}>
          <StylesPanel />
        </div>
        <div style={{ display: tab === "traits" ? "block" : "none" }}>
          <TraitsPanel />
        </div>
      </div>
    </aside>
  );
}
