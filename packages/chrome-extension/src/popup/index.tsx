/**
 * Extension popup — minimal capture UI.
 *
 * Single-view: status dot (bridge connected/disconnected), "Start
 * capture" / "Stop capture" toggle, and an error banner for
 * "DesignJS not running" (bridge connection refused) or "selection
 * too large" (serializer exceeded 500KB).
 *
 * Intentionally tiny — the actual capture UX lives in the content
 * script's DOM overlay, not in the popup.
 */

import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import type { BridgeStatus } from "../transport/ws-client.js";

function App() {
  const [status, setStatus] = useState<BridgeStatus>("disconnected");
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "bridge-status:request" }, (res) => {
      if (res?.status) setStatus(res.status);
    });
    const listener = (msg: { type: string; status?: BridgeStatus; error?: string }) => {
      if (msg.type === "bridge-status" && msg.status) setStatus(msg.status);
      if (msg.type === "capture:error") setError(msg.error ?? "Unknown error");
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const start = async () => {
    setError(null);
    setCapturing(true);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "capture:start" });
  };

  const stop = async () => {
    setCapturing(false);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "capture:stop" });
  };

  return (
    <div style={{ padding: 16, width: 280, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 14, margin: 0, marginBottom: 8 }}>DesignJS capture</h1>
      <div style={{ fontSize: 12, marginBottom: 12 }}>
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: status === "connected" ? "#22c55e" : "#9ca3af",
            marginRight: 6,
          }}
        />
        {status === "connected"
          ? "Connected to canvas"
          : status === "connecting"
            ? "Connecting…"
            : "DesignJS not running"}
      </div>
      {status !== "connected" && (
        <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 12 }}>
          Run <code>pnpm dev</code> in the DesignJS repo, then reload this popup.
        </p>
      )}
      <button
        onClick={capturing ? stop : start}
        disabled={status !== "connected"}
        style={{
          width: "100%",
          padding: "8px 12px",
          fontSize: 13,
          cursor: status === "connected" ? "pointer" : "not-allowed",
        }}
      >
        {capturing ? "Stop capture" : "Start capture"}
      </button>
      {error && (
        <p style={{ fontSize: 11, color: "#dc2626", marginTop: 8 }}>{error}</p>
      )}
    </div>
  );
}

const container = document.getElementById("root");
if (container) createRoot(container).render(<App />);
