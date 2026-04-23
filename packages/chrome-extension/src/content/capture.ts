/**
 * Content-script entry — the capture flow inside the target page.
 *
 * Wires the DOM walker + style serializer together, listens for
 * "start-capture" messages from the popup/background, and sends
 * "capture:send" messages back with the serialized HTML.
 */

import { createWalker } from "../capture/dom-walker.js";
import { serialize } from "../capture/style-serializer.js";

let walker: ReturnType<typeof createWalker> | null = null;

function startCapture(): void {
  if (walker) return;
  walker = createWalker({
    onCommit: (el) => {
      const result = serialize(el);
      if ("error" in result) {
        chrome.runtime.sendMessage({
          type: "capture:error",
          error: result.error,
          nodeCount: result.nodeCount,
          byteCount: result.byteCount,
        });
        stopCapture();
        return;
      }
      chrome.runtime.sendMessage({
        type: "capture:send",
        html: result.html,
        nodeCount: result.nodeCount,
        byteCount: result.byteCount,
      });
      stopCapture();
    },
    onExit: () => stopCapture(),
  });
  walker.start();
}

function stopCapture(): void {
  walker?.stop();
  walker = null;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "capture:start") startCapture();
  if (msg?.type === "capture:stop") stopCapture();
});
