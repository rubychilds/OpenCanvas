import type { Editor } from "grapesjs";

/**
 * Module-scoped store of CSS custom properties currently applied to the canvas
 * iframe `:root`. The MCP get_variables/set_variables handlers read and write
 * this store; persistence reads it via getVariables() to merge into the saved
 * .opencanvas.json blob, and loadVariables() rehydrates it on page load.
 *
 * Keys are full custom-property names including the leading `--` (e.g.
 * "--brand-primary"). Values are CSS strings.
 *
 * Multi-artboard note: setProperty is invoked on `editor.Canvas.getDocument()`
 * which returns the primary frame's document. Variables are NOT yet broadcast
 * across multiple artboard frames — Phase B can extend applyAll() to iterate
 * editor.Canvas.getFrames() once the multi-frame UI lands.
 */
const store = new Map<string, string>();

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
 * Used on page load to rehydrate from .opencanvas.json. If the iframe document
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
 * Test/reset hook — clears the in-memory store. Does not touch the iframe.
 * Useful when the page reloads and the module-scoped Map would otherwise
 * survive a Vite HMR boundary in dev.
 */
export function resetVariablesStore(): void {
  store.clear();
}

function applyAll(editor: Editor): boolean {
  const doc = editor.Canvas.getDocument();
  const root = doc?.documentElement;
  if (!root) return false;
  for (const [k, v] of store) {
    root.style.setProperty(k, v);
  }
  return true;
}
