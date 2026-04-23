/**
 * Extension popup — capture UI.
 *
 * Single-view: status indicator (bridge connected / disconnected),
 * "Start capture" / "Stop capture" toggle, and an error banner for
 * "DesignJS not running" or "selection too large". Uses the shared
 * DesignJS editor-chrome token palette (see theme.css) so the popup
 * feels continuous with the canvas.
 *
 * Intentionally tiny — the active capture UX lives in the content
 * script's DOM overlay, not in the popup.
 */

import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import type { BridgeStatus } from "../transport/ws-client.js";
import { Button } from "./components/ui/button.js";
import { cn } from "../lib/utils.js";
import "./popup.css";

type CaptureError = "too-large" | "bridge-disconnected" | "unknown";

function StatusDot({ status }: { status: BridgeStatus }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full transition-colors",
        status === "connected"
          ? "bg-oc-success"
          : status === "connecting"
            ? "bg-oc-warning animate-pulse"
            : "bg-muted-foreground/40",
      )}
      aria-hidden
    />
  );
}

function StatusLine({ status }: { status: BridgeStatus }) {
  const label =
    status === "connected"
      ? "Connected to canvas"
      : status === "connecting"
        ? "Connecting…"
        : "DesignJS not running";
  return (
    <div className="flex items-center gap-2 text-[var(--text-sm)] text-foreground">
      <StatusDot status={status} />
      <span>{label}</span>
    </div>
  );
}

function App() {
  const [status, setStatus] = useState<BridgeStatus>("disconnected");
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<CaptureError | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "bridge-status:request" }, (res) => {
      if (res?.status) setStatus(res.status);
    });
    const listener = (msg: {
      type: string;
      status?: BridgeStatus;
      error?: CaptureError;
    }) => {
      if (msg.type === "bridge-status" && msg.status) setStatus(msg.status);
      if (msg.type === "capture:error") setError(msg.error ?? "unknown");
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const start = async () => {
    setError(null);
    setCapturing(true);
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "capture:start" });
  };

  const stop = async () => {
    setCapturing(false);
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "capture:stop" });
  };

  const disconnected = status !== "connected";

  return (
    <div className="rounded-lg border border-border bg-card shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-[var(--text-base)] font-semibold tracking-tight">
          DesignJS capture
        </h1>
        <span className="text-[var(--text-xs)] text-muted-foreground">
          v0.1
        </span>
      </header>
      <div className="px-4 py-3 space-y-3">
        <StatusLine status={status} />
        {disconnected && (
          <p className="text-[var(--text-xs)] text-muted-foreground leading-relaxed">
            Run <code className="px-1 py-0.5 rounded-sm bg-muted text-foreground font-mono text-[10px]">pnpm dev</code>{" "}
            in the DesignJS repo, then reopen this popup.
          </p>
        )}
        <Button
          onClick={capturing ? stop : start}
          disabled={disconnected}
          fullWidth
          variant={capturing ? "outline" : "default"}
        >
          {capturing ? "Stop capture" : "Start capture"}
        </Button>
        {error && (
          <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-[var(--text-xs)] text-destructive">
            {error === "too-large"
              ? "Selection too large. Try capturing a smaller section."
              : error === "bridge-disconnected"
                ? "Lost connection to DesignJS. Check that pnpm dev is still running."
                : "Something went wrong. Check the extension logs."}
          </div>
        )}
      </div>
      <footer className="px-4 py-2.5 bg-muted/50 text-[var(--text-xs)] text-muted-foreground text-center">
        Hover a web element and press <kbd className="px-1 py-0.5 rounded-sm bg-background border border-border font-mono text-[10px]">Enter</kbd>{" "}
        to capture.
      </footer>
    </div>
  );
}

const container = document.getElementById("root");
if (container) createRoot(container).render(<App />);
