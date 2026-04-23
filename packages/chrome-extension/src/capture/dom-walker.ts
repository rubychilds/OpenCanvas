/**
 * Keyboard-driven DOM walker — Story 8.1 element selection UI.
 *
 * Renders a colored hover overlay over the element under focus, with a
 * dimensions + tag-name label. Keyboard navigation moves the focus
 * through the DOM tree:
 *
 *   ↑ / ↓ — parent / first child
 *   ← / → — previous / next sibling
 *   Enter — commit the selection and hand off to the style serializer
 *   Escape — exit capture mode
 *
 * Runs in the content-script world (not the page world), so it has
 * access to the target page's DOM but not its JavaScript globals.
 * Overlay is rendered into a fixed-positioned div attached to
 * document.documentElement so CSS from the target page doesn't affect it.
 */

export interface WalkerOptions {
  onCommit: (el: Element) => void;
  onExit: () => void;
}

export interface Walker {
  start(): void;
  stop(): void;
  focus: Element | null;
}

export function createWalker(opts: WalkerOptions): Walker {
  let focus: Element | null = null;
  let active = false;

  // TODO: implement per ADR-0011. Overlay rendering, key listeners,
  // focus management, visual highlight. Exclude display:none children
  // when walking into a subtree.
  void opts;

  return {
    start() {
      active = true;
      focus = document.body;
    },
    stop() {
      active = false;
      focus = null;
    },
    get focus() {
      return focus;
    },
  } as Walker;
}
