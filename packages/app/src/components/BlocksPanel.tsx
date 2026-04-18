import { BlocksProvider, useEditorMaybe } from "@grapesjs/react";

export function BlocksPanel() {
  const editor = useEditorMaybe();
  return (
    <BlocksProvider>
      {({ mapCategoryBlocks }) => (
        <div className="flex flex-col gap-4">
          {Array.from(mapCategoryBlocks.entries()).map(([category, blocks]) => (
            <section key={category} className="flex flex-col gap-1.5">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground px-0.5">
                {category || "Other"}
              </h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-1">
                {blocks.map((block) => (
                  <button
                    type="button"
                    key={block.getId()}
                    className={
                      "h-14 rounded-md border border-border bg-background px-1.5 py-1 " +
                      "text-xs text-center text-foreground transition-colors " +
                      "hover:bg-surface-sunken hover:border-oc-accent " +
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    }
                    title={block.getLabel()}
                    data-block-id={block.getId()}
                    onClick={() => {
                      const content = block.get("content");
                      if (typeof content === "string") editor?.addComponents(content);
                    }}
                  >
                    {block.getLabel()}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </BlocksProvider>
  );
}
