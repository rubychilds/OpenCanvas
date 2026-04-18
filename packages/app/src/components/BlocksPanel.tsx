import { BlocksProvider, useEditorMaybe } from "@grapesjs/react";
import { Box } from "lucide-react";
import { BLOCK_ICONS } from "../canvas/icons.js";

export function BlocksPanel() {
  const editor = useEditorMaybe();
  return (
    <BlocksProvider>
      {({ mapCategoryBlocks }) => (
        <div className="flex flex-col gap-3">
          {Array.from(mapCategoryBlocks.entries()).map(([category, blocks]) => (
            <section key={category} className="flex flex-col">
              <h3 className="h-(--section-title-height) text-xs uppercase tracking-wider text-muted-foreground px-0.5 mb-1">
                {category || "Other"}
              </h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(68px,1fr))] gap-1">
                {blocks.map((block) => {
                  const id = block.getId();
                  const Icon = BLOCK_ICONS[id] ?? Box;
                  return (
                    <button
                      type="button"
                      key={id}
                      className={
                        "group flex flex-col items-center justify-center gap-1 " +
                        "h-14 rounded-md border border-border bg-background px-1 " +
                        "text-muted-foreground transition-colors " +
                        "hover:bg-surface-sunken hover:border-oc-accent hover:text-foreground " +
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      }
                      title={block.getLabel()}
                      data-block-id={id}
                      onClick={() => {
                        const content = block.get("content");
                        if (typeof content === "string") editor?.addComponents(content);
                      }}
                    >
                      <Icon className="size-4" aria-hidden />
                      <span className="text-[10px] leading-tight truncate w-full text-center">
                        {block.getLabel()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </BlocksProvider>
  );
}
