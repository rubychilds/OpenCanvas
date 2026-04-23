/**
 * Keyboard-driven DOM walker — Story 8.1 element selection UI.
 *
 * Renders a fixed-position highlight box over the focused element
 * with a label showing tag name + dimensions. Keyboard navigates
 * the DOM tree, Enter commits the selection, Escape exits.
 *
 *   ↑   parent element
 *   ↓   first element-child
 *   ←   previous element-sibling
 *   →   next element-sibling
 *   ⏎   commit (→ onCommit)
 *   ⎋   exit   (→ onExit)
 *
 * Mouse hover also moves focus, excluding the DesignJS overlay itself
 * (any element inside #designjs-capture-root is filtered out).
 */

export interface WalkerOptions {
  onCommit: (el: Element) => void;
  onExit: () => void;
}

export interface Walker {
  start(): void;
  stop(): void;
  readonly focus: Element | null;
}

const OVERLAY_ID = "designjs-capture-root";
const HIGHLIGHT_ID = "designjs-capture-highlight";
const HIGHLIGHT_LABEL_ID = "designjs-capture-highlight-label";

function isInsideOverlay(el: Element | null): boolean {
  return !!el?.closest?.(`#${OVERLAY_ID}`);
}

function isValidTarget(el: Element | null): el is Element {
  if (!el) return false;
  if (isInsideOverlay(el)) return false;
  // Exclude the <html> root — walking above it leaves no viable target.
  if (el === document.documentElement) return false;
  return true;
}

export function createWalker(opts: WalkerOptions): Walker {
  let focused: Element | null = null;
  let active = false;
  let highlightEl: HTMLDivElement | null = null;
  let labelEl: HTMLDivElement | null = null;
  let rafHandle: number | null = null;

  const ensureHighlight = (): { box: HTMLDivElement; label: HTMLDivElement } => {
    if (highlightEl && labelEl) return { box: highlightEl, label: labelEl };

    const box = document.createElement("div");
    box.id = HIGHLIGHT_ID;
    box.style.cssText = [
      "position: fixed",
      "pointer-events: none",
      "z-index: 2147483646", // one below the overlay itself
      "outline: 2px solid oklch(0.55 0.2 260 / 0.9)", // oc-accent
      "outline-offset: -2px",
      "background: oklch(0.55 0.2 260 / 0.08)",
      "box-sizing: border-box",
      "transition: top 60ms ease-out, left 60ms ease-out, width 60ms ease-out, height 60ms ease-out",
    ].join(";");

    const label = document.createElement("div");
    label.id = HIGHLIGHT_LABEL_ID;
    label.style.cssText = [
      "position: fixed",
      "pointer-events: none",
      "z-index: 2147483647",
      "background: oklch(0.55 0.2 260)",
      "color: white",
      "font: 500 10px/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      "padding: 3px 6px",
      "border-radius: 3px",
      "white-space: nowrap",
    ].join(";");

    document.documentElement.appendChild(box);
    document.documentElement.appendChild(label);
    highlightEl = box;
    labelEl = label;
    return { box, label };
  };

  const removeHighlight = () => {
    highlightEl?.remove();
    labelEl?.remove();
    highlightEl = null;
    labelEl = null;
  };

  const paint = () => {
    rafHandle = null;
    if (!focused) {
      removeHighlight();
      return;
    }
    const rect = focused.getBoundingClientRect();
    const { box, label } = ensureHighlight();
    box.style.top = `${rect.top}px`;
    box.style.left = `${rect.left}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;

    const tag = focused.tagName.toLowerCase();
    label.textContent = `${tag}  ${Math.round(rect.width)}×${Math.round(rect.height)}`;
    // Position label above the box; if that would clip off-screen, put it below.
    const labelTop =
      rect.top - 22 < 4 ? rect.bottom + 4 : rect.top - 22;
    label.style.top = `${labelTop}px`;
    label.style.left = `${rect.left}px`;
  };

  const schedulePaint = () => {
    if (rafHandle != null) return;
    rafHandle = requestAnimationFrame(paint);
  };

  const setFocus = (el: Element | null) => {
    if (!isValidTarget(el)) return;
    focused = el;
    schedulePaint();
  };

  const onMouseOver = (ev: MouseEvent) => {
    if (!active) return;
    const target = ev.target as Element | null;
    if (!isValidTarget(target)) return;
    setFocus(target);
  };

  const onKeyDown = (ev: KeyboardEvent) => {
    if (!active) return;
    if (!ev.isTrusted) return;
    if (!focused) return;

    let next: Element | null = null;
    switch (ev.key) {
      case "ArrowUp":
        next = focused.parentElement;
        break;
      case "ArrowDown":
        next = focused.firstElementChild;
        break;
      case "ArrowLeft":
        next = focused.previousElementSibling;
        break;
      case "ArrowRight":
        next = focused.nextElementSibling;
        break;
      case "Enter": {
        ev.preventDefault();
        ev.stopPropagation();
        const committed = focused;
        stop();
        opts.onCommit(committed);
        return;
      }
      case "Escape": {
        ev.preventDefault();
        ev.stopPropagation();
        stop();
        opts.onExit();
        return;
      }
      default:
        return;
    }

    if (isValidTarget(next)) {
      ev.preventDefault();
      ev.stopPropagation();
      setFocus(next);
    }
  };

  const onScroll = () => {
    if (active) schedulePaint();
  };

  const start = () => {
    if (active) return;
    active = true;
    focused = document.body;
    document.addEventListener("mouseover", onMouseOver, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    schedulePaint();
  };

  const stop = () => {
    if (!active) return;
    active = false;
    document.removeEventListener("mouseover", onMouseOver, true);
    document.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("resize", onScroll);
    if (rafHandle != null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
    removeHighlight();
    focused = null;
  };

  return {
    start,
    stop,
    get focus() {
      return focused;
    },
  };
}
