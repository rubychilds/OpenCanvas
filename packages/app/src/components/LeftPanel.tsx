import { useState } from "react";
import { BlocksPanel } from "./BlocksPanel.js";
import { LayersPanel } from "./LayersPanel.js";

type Tab = "blocks" | "layers";

export function LeftPanel() {
  const [tab, setTab] = useState<Tab>("blocks");
  return (
    <aside className="oc-panel">
      <div className="oc-panel__tabs">
        <button
          type="button"
          className={`oc-panel__tab${tab === "blocks" ? " oc-panel__tab--active" : ""}`}
          onClick={() => setTab("blocks")}
        >
          Blocks
        </button>
        <button
          type="button"
          className={`oc-panel__tab${tab === "layers" ? " oc-panel__tab--active" : ""}`}
          onClick={() => setTab("layers")}
        >
          Layers
        </button>
      </div>
      <div className="oc-panel__body">
        <div style={{ display: tab === "blocks" ? "block" : "none" }}>
          <BlocksPanel />
        </div>
        <div style={{ display: tab === "layers" ? "block" : "none" }}>
          <LayersPanel />
        </div>
      </div>
    </aside>
  );
}
