import { useMemo, useState } from "react";
import { useEditorMaybe } from "@grapesjs/react";
import type { Component, Editor } from "grapesjs";
import { Minus, PlusOutline } from "../../canvas/chrome-icons.js";
import { cn } from "../../lib/utils.js";
import { htmlToJsx, mergeStylesIntoHtml, type JsxMode } from "../../canvas/jsx-export.js";
import { FieldGroup, InspectorSection } from "./InspectorSection.js";
import { Button } from "../ui/button.js";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip.js";

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
    console.warn("[designjs] clipboard copy failed:", err);
  }
}

export function ExportsSection({ component }: { component: Component }) {
  const editor = useEditorMaybe();
  const [mode, setMode] = useState<JsxMode>("tailwind");
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  // Closed by default — the preview + three copy buttons take real vertical
  // space and most users don't need them on every selection. Opens via the
  // section-header + toggle, same pattern as Fill / Effects / Auto Layout.
  const [opened, setOpened] = useState(false);

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

  const toggleControl = (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setOpened((v) => !v)}
          aria-pressed={opened}
          aria-label={opened ? "Hide export" : "Show export"}
          className={cn(
            "flex items-center justify-center h-5 w-5 rounded-sm transition-colors",
            // Same selected-state treatment as Auto Layout / Blend toggles:
            // light-blue fill with darker-blue stroke when open.
            opened
              ? "bg-oc-accent/15 text-oc-accent"
              : "text-muted-foreground hover:text-foreground hover:bg-background",
          )}
          data-testid="oc-ins-exports-toggle"
        >
          {opened ? <Minus className="size-3.5" /> : <PlusOutline className="size-3.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>{opened ? "Hide export" : "Show export"}</TooltipContent>
    </Tooltip>
  );

  return (
    <InspectorSection title="Export" action={toggleControl} muted={!opened}>
      {opened ? (
        <>
          <FieldGroup label="JSX">
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(v) => {
                if (v === "tailwind" || v === "inline") setMode(v);
              }}
              data-testid="oc-ins-exports-mode"
            >
              <ToggleGroupItem
                value="tailwind"
                aria-label="Tailwind"
                className="px-2 text-[11px] w-auto"
              >
                Tailwind
              </ToggleGroupItem>
              <ToggleGroupItem
                value="inline"
                aria-label="Inline"
                className="px-2 text-[11px] w-auto"
              >
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
        </>
      ) : null}
    </InspectorSection>
  );
}
