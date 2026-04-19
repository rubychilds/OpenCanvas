import { useMemo, useState } from "react";
import { useEditorMaybe } from "@grapesjs/react";
import type { Component, Editor } from "grapesjs";
import { cn } from "../../lib/utils.js";
import { htmlToJsx, mergeStylesIntoHtml, type JsxMode } from "../../canvas/jsx-export.js";
import { FieldGroup, InspectorSection } from "./InspectorSection.js";
import { Button } from "../ui/button.js";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group.js";

type CopyTarget = "jsx" | "html" | "css";

function buildHtml(editor: Editor, component: Component): string {
  const html = (component as unknown as { toHTML?: () => string }).toHTML?.() ?? "";
  const css =
    (editor as unknown as { getCss?: (opts?: { component: Component }) => string })
      .getCss?.({ component }) ?? "";
  return mergeStylesIntoHtml(html, css);
}

function buildCss(editor: Editor, component: Component): string {
  return (
    (editor as unknown as { getCss?: (opts?: { component: Component }) => string })
      .getCss?.({ component }) ?? ""
  );
}

async function copyText(value: string, key: CopyTarget, flash: (k: CopyTarget) => void): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    flash(key);
  } catch (err) {
    console.warn("[opencanvas] clipboard copy failed:", err);
  }
}

export function ExportsSection({ component }: { component: Component }) {
  const editor = useEditorMaybe();
  const [mode, setMode] = useState<JsxMode>("tailwind");
  const [copied, setCopied] = useState<CopyTarget | null>(null);

  const { jsx, html, css } = useMemo(() => {
    if (!editor) return { jsx: "", html: "", css: "" };
    const mergedHtml = buildHtml(editor, component);
    const rawHtml = (component as unknown as { toHTML?: () => string }).toHTML?.() ?? "";
    return {
      jsx: htmlToJsx(mergedHtml, mode),
      html: rawHtml,
      css: buildCss(editor, component),
    };
  }, [editor, component, mode]);

  const flash = (key: CopyTarget) => {
    setCopied(key);
    window.setTimeout(() => {
      setCopied((prev) => (prev === key ? null : prev));
    }, 1200);
  };

  const label = (key: CopyTarget, base: string) => (copied === key ? "Copied" : base);

  return (
    <InspectorSection title="Exports">
      <FieldGroup label="JSX">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => {
            if (v === "tailwind" || v === "inline") setMode(v);
          }}
          data-testid="oc-ins-exports-mode"
        >
          <ToggleGroupItem value="tailwind" aria-label="Tailwind" className="px-2 text-[11px] w-auto">
            Tailwind
          </ToggleGroupItem>
          <ToggleGroupItem value="inline" aria-label="Inline" className="px-2 text-[11px] w-auto">
            Inline
          </ToggleGroupItem>
        </ToggleGroup>
      </FieldGroup>

      <pre
        className={cn(
          "max-h-40 overflow-auto rounded-md border border-border bg-surface-sunken",
          "p-2 text-[11px] leading-tight tabular-nums whitespace-pre",
        )}
        data-testid="oc-ins-exports-preview"
      >
        {jsx || "// select a component"}
      </pre>

      <div className="grid grid-cols-3 gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => copyText(jsx, "jsx", flash)}
          data-testid="oc-ins-exports-copy-jsx"
        >
          {label("jsx", "Copy JSX")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => copyText(html, "html", flash)}
          data-testid="oc-ins-exports-copy-html"
        >
          {label("html", "Copy HTML")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => copyText(css, "css", flash)}
          data-testid="oc-ins-exports-copy-css"
        >
          {label("css", "Copy CSS")}
        </Button>
      </div>
    </InspectorSection>
  );
}
