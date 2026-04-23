/**
 * Background service worker — DesignJS capture extension.
 *
 * Responsibilities per ADR-0011:
 * - Owns the WebSocket connection to the DesignJS canvas bridge
 *   (ws://127.0.0.1:29170/designjs-bridge), identifying as a
 *   `browser-extension` peer.
 * - Relays capture payloads from the content script → canvas.
 * - Reports connection status back to the popup.
 *
 * Kept deliberately thin — the heavy lifting (DOM walk, style serializer,
 * user-facing UI) lives in the content script + popup.
 */

import { connectToBridge, type BridgeStatus } from "../transport/ws-client.js";

const bridge = connectToBridge({
  onStatus: (status: BridgeStatus) => {
    chrome.runtime.sendMessage({ type: "bridge-status", status }).catch(() => {
      // Popup not open — ignore.
    });
  },
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "capture:send") {
    bridge
      .send({ type: "add_components", html: msg.html })
      .then(() => sendResponse({ ok: true }))
      .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
    return true; // async
  }
  if (msg?.type === "bridge-status:request") {
    sendResponse({ status: bridge.currentStatus() });
    return false;
  }
  return false;
});
