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

// ────────────────────────────────────────────────────────────────────
// Wiring
// ────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "toggle-overlay") toggleOverlay();
  if (msg?.type === "capture:start") startCapture();
  if (msg?.type === "capture:stop") stopCapture();
});

// The overlay's Start/Stop button posts via window.postMessage (simpler
// than extensions' own messaging because it stays in-script); we listen
// here and route through chrome.runtime so the background gets the echo.
window.addEventListener("message", (ev) => {
  if (ev.source !== window) return;
  if (ev.data?.type === "designjs:capture:start") startCapture();
  if (ev.data?.type === "designjs:capture:stop") stopCapture();
});
