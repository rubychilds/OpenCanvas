import { BlocksProvider } from "@grapesjs/react";
import { useEditorMaybe } from "@grapesjs/react";

export function BlocksPanel() {
  const editor = useEditorMaybe();
  return (
    <BlocksProvider>
      {({ mapCategoryBlocks }) => (
        <div className="oc-blocks">
          {Array.from(mapCategoryBlocks.entries()).map(([category, blocks]) => (
            <section key={category} className="oc-blocks__category">
              <h3 className="oc-blocks__category-title">{category || "Other"}</h3>
              <div className="oc-blocks__grid">
                {blocks.map((block) => (
                  <button
                    type="button"
                    key={block.getId()}
                    className="oc-blocks__item"
                    title={block.getLabel()}
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
