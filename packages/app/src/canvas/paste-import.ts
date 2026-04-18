import type { Component, Editor } from "grapesjs";

export interface PasteImportHooks {
  /** Fired after a paste lands on the canvas, with the HTML payload that was imported. */
  onImport?: (html: string) => void;
}

/**
 * Imports a clipboard HTML payload onto the canvas. If a component is currently
 * selected the HTML is appended as a child of that component; otherwise it lands
 * at the top level via editor.addComponents(). GrapesJS handles HTML parsing,
 * Tailwind class round-tripping, and broken-image-URL placeholders for us, so
 * this is a thin wrapper.
 *
 * No-ops on empty/whitespace input — mirrors the paste listener so the
 * `__opencanvas.paste` test hook behaves like a real paste event.
 */
export function importPastedHtml(editor: Editor, html: string): unknown {
  if (!html.trim()) return undefined;
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
