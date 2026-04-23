/**
 * Content-script entry — DesignJS overlay injection + capture flow.
 *
 * Matches Orbis' content-script-injected pattern (packages/chrome-ext-
 * orbis/src/content/popup-injector.tsx). Rationale in ADR-0011 §UX:
 * browser-action popups have a browser-drawn square background that
 * fights with rounded cards; injecting our own container gives us
 * complete visual control.
 *
 * Responsibilities:
 * - Listens for `toggle-overlay` from the background service worker
 *   (fired by chrome.action.onClicked) and mounts / unmounts the
 *   React overlay.
 * - Listens for `capture:start` / `capture:stop` and drives the DOM
 *   walker + style serializer. Serialized HTML is forwarded to the
 *   background, which relays over the bridge to the DesignJS canvas.
 * - Dismisses the overlay on Escape or outside-click.
 */

import { createRoot, type Root } from "react-dom/client";
import { App } from "../overlay/App.js";
import "../overlay/overlay.css";
import { createWalker } from "../capture/dom-walker.js";
import { serialize } from "../capture/style-serializer.js";

const ROOT_ID = "designjs-capture-root";

interface OverlayInstance {
  el: HTMLElement;
  root: Root;
  cleanupListeners: () => void;
}

let overlay: OverlayInstance | null = null;

function mountOverlay(): OverlayInstance {
  const existing = document.getElementById(ROOT_ID);
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.id = ROOT_ID;
  document.documentElement.appendChild(el);

  const root = createRoot(el);
  root.render(<App onDismiss={dismissOverlay} />);

  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === "Escape" && ev.isTrusted) dismissOverlay();
  };
  document.addEventListener("keydown", onKey);

  return {
    el,
    root,
    cleanupListeners: () => document.removeEventListener("keydown", onKey),
  };
}

function dismissOverlay(): void {
  if (!overlay) return;
  overlay.cleanupListeners();
  overlay.root.unmount();
  overlay.el.remove();
  overlay = null;
  stopCapture();
}

function toggleOverlay(): void {
  if (overlay) {
    dismissOverlay();
  } else {
    overlay = mountOverlay();
  }
}

// ────────────────────────────────────────────────────────────────────
// Capture flow
// ────────────────────────────────────────────────────────────────────

let walker: ReturnType<typeof createWalker> | null = null;

function startCapture(): void {
  if (walker) return;
  walker = createWalker({
    onCommit: (el) => {
      const result = serialize(el);
      if ("error" in result) {
        window.postMessage(
          {
            type: "designjs:capture:result",
            ok: false,
            error: result.error,
            nodeCount: result.nodeCount,
            byteCount: result.byteCount,
          },
          "*",
        );
        walker = null;
        return;
      }
      // Tell the overlay we're sending — state: "sending"
      window.postMessage(
        {
          type: "designjs:capture:progress",
          phase: "sending",
          nodeCount: result.nodeCount,
          byteCount: result.byteCount,
        },
        "*",
      );
      chrome.runtime.sendMessage(
        {
          type: "capture:send",
          html: result.html,
          nodeCount: result.nodeCount,
          byteCount: result.byteCount,
        },
        (bgResponse: { ok: boolean; error?: string } | undefined) => {
          window.postMessage(
            {
              type: "designjs:capture:result",
              ok: bgResponse?.ok === true,
              error: bgResponse?.ok === false ? bgResponse.error : undefined,
              nodeCount: result.nodeCount,
              byteCount: result.byteCount,
            },
            "*",
          );
        },
      );
      walker = null;
    },
    onExit: () => {
      walker = null;
      window.postMessage({ type: "designjs:capture:result", ok: false, error: "cancelled" }, "*");
    },
  });
  walker.start();
}

function stopCapture(): void {
  walker?.stop();
  walker = null;
}

/**
 * Whole-page capture — skips the hover walker and serializes the full
 * `<body>`. The overlay is mounted at `document.documentElement` so it
 * isn't nested inside body and won't pollute the capture.
 *
 * Raises the payload cap to 2MB — whole pages routinely exceed the 500KB
 * default that's tuned for element selection.
 */
const PAGE_CAPTURE_HARD_LIMIT = 2 * 1024 * 1024;

function capturePage(): void {
  if (walker) {
    walker.stop();
    walker = null;
  }
  const root = document.body;
  if (!root) {
    window.postMessage(
      { type: "designjs:capture:result", ok: false, error: "empty-input" },
      "*",
    );
    return;
  }
  const t0 = performance.now();
  const result = serialize(root, { hardLimit: PAGE_CAPTURE_HARD_LIMIT });
  const t1 = performance.now();
  if ("error" in result) {
    console.warn("[designjs] page serialize failed:", result);
    window.postMessage(
      {
        type: "designjs:capture:result",
        ok: false,
        error: result.error,
        nodeCount: result.nodeCount,
        byteCount: result.byteCount,
      },
      "*",
    );
    return;
  }
  console.log(
    `[designjs] page captured: ${result.nodeCount} nodes, ${(result.byteCount / 1024).toFixed(0)}KB, serialized in ${Math.round(t1 - t0)}ms`,
  );
  // GrapesJS' HTML parser filters <body> when it appears inside another body's
  // wrapper component — the content lands in a detached tree. Swap the outer
  // tag for <div> so the inlined styles still apply but the nesting is legal.
  const html = result.html.replace(/^<body\b/, "<div").replace(/<\/body>$/, "</div>");

  // Whole-page capture always lands in its own fresh artboard — a page is
  // conceptually its own canvas, not content to append to whatever frame
  // happens to exist (which may be nothing, if the user deleted them all).
  const width = Math.min(document.documentElement.scrollWidth || window.innerWidth, 3840);
  const height = Math.min(
    document.documentElement.scrollHeight || window.innerHeight,
    20000,
  );
  const name = document.title || new URL(window.location.href).hostname;

  window.postMessage(
    {
      type: "designjs:capture:progress",
      phase: "sending",
      nodeCount: result.nodeCount,
      byteCount: result.byteCount,
    },
    "*",
  );
  chrome.runtime.sendMessage(
    {
      type: "capture:send",
      html,
      newArtboard: { name, width, height },
      nodeCount: result.nodeCount,
      byteCount: result.byteCount,
    },
    (bgResponse: { ok: boolean; error?: string } | undefined) => {
      if (bgResponse?.ok !== true) {
        console.error("[designjs] bridge rejected page capture:", bgResponse);
      }
      window.postMessage(
        {
          type: "designjs:capture:result",
          ok: bgResponse?.ok === true,
          error: bgResponse?.ok === false ? bgResponse.error : undefined,
          nodeCount: result.nodeCount,
          byteCount: result.byteCount,
        },
        "*",
      );
    },
  );
}

// ────────────────────────────────────────────────────────────────────
// Wiring
// ────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "toggle-overlay") toggleOverlay();
  if (msg?.type === "capture:start") startCapture();
  if (msg?.type === "capture:stop") stopCapture();
  if (msg?.type === "capture:page") capturePage();
});

// The overlay's Start/Stop button posts via window.postMessage (simpler
// than extensions' own messaging because it stays in-script); we listen
// here and route through chrome.runtime so the background gets the echo.
window.addEventListener("message", (ev) => {
  if (ev.source !== window) return;
  if (ev.data?.type === "designjs:capture:start") startCapture();
  if (ev.data?.type === "designjs:capture:stop") stopCapture();
  if (ev.data?.type === "designjs:capture:page") capturePage();
});
