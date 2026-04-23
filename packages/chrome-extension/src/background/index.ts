/**
 * Background service worker — DesignJS capture extension.
 *
 * Responsibilities per ADR-0011:
 * - Owns the WebSocket connection to the DesignJS canvas bridge
 *   (ws://127.0.0.1:29170/designjs-bridge), identifying as a
 *   `browser-extension` peer.
 * - Relays capture payloads from the content script → canvas.
 * - On extension-icon click, asks the active tab's content script to
 *   toggle the injected overlay. No browser-action popup is used —
 *   see ADR-0011 §UX and packages/chrome-ext-orbis for the reference
 *   pattern.
 *
 * Kept deliberately thin — the heavy lifting (DOM walk, style
 * serializer, overlay rendering) lives in the content script.
 */

import { connectToBridge, type BridgeStatus } from "../transport/ws-client.js";

const bridge = connectToBridge({
  onStatus: (status: BridgeStatus) => {
    // Broadcast to any content scripts / overlays that are listening.
    // No tab id — the runtime delivers to all extension views.
    chrome.runtime.sendMessage({ type: "bridge-status", status }).catch(() => {
      // No listeners — ignore.
    });
  },
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.tabs
    .sendMessage(tab.id, { type: "toggle-overlay" })
    .catch(() => {
      // Content script not injected on this tab (e.g. chrome:// pages,
      // the Chrome Web Store, new-tab pages). Nothing we can do — the
      // content-script matcher excludes these by default.
    });
});

/**
 * Land a capture on the canvas. When `newArtboard` is set (whole-page
 * capture), first create the artboard, append the HTML, then fit the
 * artboard height to the actually-rendered content. Source-page
 * scrollHeight is unreliable when images lazy-load without aspect-
 * ratio placeholders (collapses to text-only height), and CSS layout
 * inside the GrapesJS iframe won't match the source site anyway — so
 * we let the canvas measure itself.
 *
 * Element capture keeps its simpler single-call path: it appends into
 * the first existing frame, and sizing is the user's concern.
 */
async function relayCapture(msg: {
  html: string;
  newArtboard?: { name?: string; width: number; height: number };
}): Promise<unknown> {
  if (msg.newArtboard) {
    const { artboard } = (await bridge.send({
      tool: "create_artboard",
      params: msg.newArtboard,
    })) as { artboard: { id: string } };
    const addResult = await bridge.send({
      tool: "add_components",
      params: { html: msg.html, artboardId: artboard.id },
    });
    // fit_artboard measures the iframe content and resizes the frame
    // accordingly. Best-effort — if it fails (iframe slow to mount,
    // content not measurable) we still return the add_components result
    // so the capture isn't lost.
    try {
      await bridge.send({
        tool: "fit_artboard",
        params: { artboardId: artboard.id },
      });
    } catch (err) {
      console.warn("[designjs] fit_artboard failed after page capture:", err);
    }
    return addResult;
  }
  return bridge.send({ tool: "add_components", params: { html: msg.html } });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "capture:send") {
    relayCapture(msg)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }
  if (msg?.type === "bridge-status:request") {
    sendResponse({ status: bridge.currentStatus() });
    return false;
  }
  return false;
});
