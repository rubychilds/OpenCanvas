import type { Editor } from "grapesjs";

/**
 * Module-scoped store of CSS custom properties currently applied to the canvas
 * iframe `:root`. The MCP get_variables/set_variables handlers read and write
 * this store; persistence reads it via getVariables() to merge into the saved
 * .designjs.json blob, and loadVariables() rehydrates it on page load.
 *
 * Keys are full custom-property names including the leading `--` (e.g.
 * "--brand-primary"). Values are CSS strings.
 *
 * Writes iterate every artboard frame's iframe :root via editor.Canvas
 * .getFrames() — Canvas.getDocument() alone returns undefined under the
 * multi-frame layout shipped in v0.1 and silently drops the write.
 */
const store = new Map<string, string>();

function frameDocs(editor: Editor): Document[] {
  const docs: Document[] = [];
  for (const frame of editor.Canvas.getFrames()) {
    const view = (frame as unknown as {
      view?: { getWindow?: () => Window | undefined };
    }).view;
    const doc = view?.getWindow?.()?.document;
    if (doc) docs.push(doc);
  }
  // Fallback to the single-frame API in case getFrames() is empty (the initial
  // boot path, or a test harness that never mounts an artboard).
  if (docs.length === 0) {
    const doc = editor.Canvas.getDocument();
    if (doc) docs.push(doc);
  }
  return docs;
}

export function getVariables(): Record<string, string> {
  return Object.fromEntries(store.entries());
}

/**
 * Merges the supplied variables into the in-memory store and writes them to
 * the iframe :root. Existing keys not in `incoming` are preserved.
 * Returns the full updated map.
 */
export function setVariables(
  editor: Editor,
  incoming: Record<string, string>,
): Record<string, string> {
  for (const [k, v] of Object.entries(incoming)) {
    store.set(k, v);
  }
  applyAll(editor);
  return getVariables();
}

/**
 * Replaces the in-memory store with `vars` and applies them to the iframe.
 * Used on page load to rehydrate from .designjs.json. If the iframe document
 * isn't ready yet, polls briefly until it is so the variables actually land.
 */
export function loadVariables(editor: Editor, vars: Record<string, string>): void {
  store.clear();
  for (const [k, v] of Object.entries(vars)) {
    store.set(k, v);
  }
  if (applyAll(editor)) return;
  // Iframe doc not ready — retry for up to ~5s.
  let tries = 0;
  const interval = window.setInterval(() => {
    tries += 1;
    if (applyAll(editor) || tries > 50) {
      window.clearInterval(interval);
    }
  }, 100);
}

/**
 * Remove a single variable from the in-memory store and the iframe :root.
 * Returns the updated map.
 */
export function deleteVariable(editor: Editor, key: string): Record<string, string> {
  store.delete(key);
  for (const doc of frameDocs(editor)) {
    doc.documentElement?.style.removeProperty(key);
  }
  return getVariables();
}

/**
 * Test/reset hook — clears the in-memory store. Does not touch the iframe.
 * Useful when the page reloads and the module-scoped Map would otherwise
 * survive a Vite HMR boundary in dev.
 */
export function resetVariablesStore(): void {
  store.clear();
}

function applyAll(editor: Editor): boolean {
  const docs = frameDocs(editor);
  if (docs.length === 0) return false;
  let applied = false;
  for (const doc of docs) {
    const root = doc.documentElement;
    if (!root) continue;
    for (const [k, v] of store) {
      root.style.setProperty(k, v);
    }
    applied = true;
  }
  return applied;
}
