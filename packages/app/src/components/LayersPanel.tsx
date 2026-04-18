import { LayersProvider, useEditorMaybe } from "@grapesjs/react";
import type { Component } from "grapesjs";

interface NodeProps {
  component: Component;
  depth: number;
}

function LayerNode({ component, depth }: NodeProps) {
  const editor = useEditorMaybe();
  const label = component.getName?.() ?? component.get("tagName") ?? "node";
  const children = (component.components() as unknown as { toArray: () => Component[] }).toArray();
  return (
    <div className="oc-layers__node">
      <button
        type="button"
        className="oc-layers__row"
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => editor?.select(component)}
      >
        {label}
      </button>
      {children.map((child) => (
        <LayerNode key={child.getId()} component={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function LayersPanel() {
  return (
    <LayersProvider>
      {({ root }) => {
        if (!root) return <div className="oc-layers__empty">No layers</div>;
        const children = (root.components() as unknown as { toArray: () => Component[] }).toArray();
        if (children.length === 0) {
          return <div className="oc-layers__empty">Empty canvas</div>;
        }
        return (
          <div className="oc-layers">
            {children.map((c) => (
              <LayerNode key={c.getId()} component={c} depth={0} />
            ))}
          </div>
        );
      }}
    </LayersProvider>
  );
}
