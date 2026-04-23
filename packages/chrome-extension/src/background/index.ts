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
 * capture), first create the artboard and then append the HTML into it
 * — this is the only way to guarantee an artboard exists (element
 * capture's "append to first frame" path crashes when the user has
 * deleted every artboard).
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
    return bridge.send({
      tool: "add_components",
      params: { html: msg.html, artboardId: artboard.id },
    });
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
