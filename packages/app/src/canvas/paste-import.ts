import type { Component, Editor } from "grapesjs";

export interface PasteImportHooks {
  /** Fired after a paste lands on the canvas, with the HTML payload that was imported. */
  onImport?: (html: string) => void;
}

/**
 * Figma's web app puts two empty `<span>` elements on the system clipboard
 * carrying its proprietary fig-kiwi binary in `data-buffer`/`data-metadata`
 * comment markers — there is no semantic HTML inside. Pasting it as-is would
 * dump a megabyte of unrenderable junk into the canvas. We detect the marker
 * and refuse the import with a clear user-facing message instead.
 *
 * Source: see /Users/rubychilds/Documents/Ruby Obsidian Notes/OpenCanvas-Notes/
 * — `<!--(figma)` and `<!--(figmeta)` are the two known marker variants.
 */
export const FIGMA_CLIPBOARD_SIGNATURE = /<!--\(figma(?:meta)?\)/;

/**
 * CustomEvent fired on window when the paste handler detects Figma's binary
 * clipboard payload. UI listeners (Sonner Toaster, banner) subscribe to this
 * to surface the message to users. Detail shape:
 *   { message: string, reason: "figma-binary" }
 */
export const PASTE_BLOCKED_EVENT = "opencanvas:paste-blocked";

const FIGMA_BLOCKED_MESSAGE =
  "OpenCanvas can't paste Figma's binary clipboard payload. Right-click in " +
  "Figma → Copy as SVG/PNG for a one-shot import, or pair the Figma Dev Mode " +
  "MCP server with OpenCanvas in Cursor / Claude Code so an agent can " +
  "translate the design.";

/**
 * Imports a clipboard HTML payload onto the canvas. If a component is currently
 * selected the HTML is appended as a child of that component; otherwise it lands
 * at the top level via editor.addComponents(). GrapesJS handles HTML parsing,
 * Tailwind class round-tripping, and broken-image-URL placeholders for us, so
 * this is a thin wrapper.
 *
 * No-ops on empty/whitespace input. Refuses Figma's binary clipboard payload
 * (see FIGMA_CLIPBOARD_SIGNATURE) with a console.warn and a window event so
 * UI can surface a toast.
 */
export function importPastedHtml(editor: Editor, html: string): unknown {
  if (!html.trim()) return undefined;

  if (FIGMA_CLIPBOARD_SIGNATURE.test(html)) {
    console.warn(`[opencanvas] ${FIGMA_BLOCKED_MESSAGE}`);
    window.dispatchEvent(
      new CustomEvent(PASTE_BLOCKED_EVENT, {
        detail: { reason: "figma-binary", message: FIGMA_BLOCKED_MESSAGE },
      }),
    );
    return undefined;
  }

  const selected = editor.getSelected() as Component | undefined;
  if (selected) return selected.append(html);
  return editor.addComponents(html);
}

/**
 * Subscribes paste handlers on `window` and on the canvas iframe's contentWindow
 * so a Cmd+V with HTML in the clipboard imports onto the canvas regardless of
 * where focus lives. Plain-text or empty clipboards no-op silently — the
 * default browser paste behaviour stays in effect for inputs etc.
 *
 * Returns a disposer that detaches both listeners.
 */
export function attachPasteImport(editor: Editor, hooks: PasteImportHooks = {}): () => void {
  const handle = (ev: Event): void => {
    const ce = ev as ClipboardEvent;
    const html = ce.clipboardData?.getData("text/html") ?? "";
    if (!html.trim()) return;
    ce.preventDefault();
    importPastedHtml(editor, html);
    hooks.onImport?.(html);
  };
  // `handle` is a no-op for plain-text or empty clipboards: no preventDefault,
  // so the browser's normal paste behaviour stays in effect for inputs etc.

  window.addEventListener("paste", handle);
  const iframeEl = editor.Canvas.getFrameEl() as HTMLIFrameElement | null;
  const iframeWin = iframeEl?.contentWindow;
  iframeWin?.addEventListener("paste", handle);

  return () => {
    window.removeEventListener("paste", handle);
    iframeWin?.removeEventListener("paste", handle);
  };
}
