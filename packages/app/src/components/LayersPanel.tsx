import { LayersProvider, useEditorMaybe } from "@grapesjs/react";
import type { Component } from "grapesjs";
import { cn } from "../lib/utils.js";
import { iconForTag } from "../canvas/icons.js";

interface NodeProps {
  component: Component;
  depth: number;
}

function LayerNode({ component, depth }: NodeProps) {
  const editor = useEditorMaybe();
  const label = component.getName?.() ?? component.get("tagName") ?? "node";
  const tag = component.get("tagName") as string | undefined;
  const Icon = iconForTag(tag);
  const childArr = (component.components() as unknown as { toArray: () => Component[] }).toArray();
  return (
    <div>
      <button
        type="button"
        className={cn(
          "group flex items-center gap-1.5 w-full text-left h-(--row-height) rounded-sm truncate",
          "text-sm text-foreground hover:bg-surface-sunken",
          "focus-visible:outline-none focus-visible:bg-surface-sunken",
        )}
        style={{ paddingLeft: 8 + depth * 12, paddingRight: 8 }}
        onClick={() => editor?.select(component)}
      >
        <Icon className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
        <span className="truncate">{label}</span>
      </button>
      {childArr.map((child) => (
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
