import { LayersProvider, useEditorMaybe } from "@grapesjs/react";
import type { Component } from "grapesjs";
import { cn } from "../lib/utils.js";

interface NodeProps {
  component: Component;
  depth: number;
}

function LayerNode({ component, depth }: NodeProps) {
  const editor = useEditorMaybe();
  const label = component.getName?.() ?? component.get("tagName") ?? "node";
  const children = (component.components() as unknown as { toArray: () => Component[] }).toArray();
  return (
    <div>
      <button
        type="button"
        className={cn(
          "w-full text-left text-sm text-foreground h-6 rounded-sm truncate",
          "hover:bg-surface-sunken focus-visible:outline-none focus-visible:bg-surface-sunken",
        )}
        style={{ paddingLeft: 8 + depth * 12, paddingRight: 8 }}
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
        if (!root) {
          return <div className="p-2 text-xs text-muted-foreground">No layers</div>;
        }
        const children = (root.components() as unknown as { toArray: () => Component[] }).toArray();
        if (children.length === 0) {
          return <div className="p-2 text-xs text-muted-foreground">Empty canvas</div>;
        }
        return (
          <div className="flex flex-col gap-px">
            {children.map((c) => (
              <LayerNode key={c.getId()} component={c} depth={0} />
            ))}
          </div>
        );
      }}
    </LayersProvider>
  );
}
