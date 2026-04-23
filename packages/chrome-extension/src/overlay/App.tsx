/**
 * DesignJS capture overlay — React component rendered into an
 * injected DOM container on the host page (not a browser-action
 * popup). See content/index.tsx for the injector.
 *
 * Uses the DesignJS editor-chrome token palette (theme.css) for
 * visual continuity with the canvas. Ships with full rounded corners
 * + shadow since we control the container — no browser-popup
 * square-backdrop issue.
 */

import { useEffect, useState } from "react";
import type { BridgeStatus } from "../transport/ws-client.js";
import { Button } from "./components/ui/button.js";
import { cn } from "../lib/utils.js";

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

export interface AppProps {
  onDismiss?: () => void;
}

export function App({ onDismiss }: AppProps = {}) {
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
    window.postMessage({ type: "designjs:capture:start" }, "*");
  };

  const stop = async () => {
    setCapturing(false);
    window.postMessage({ type: "designjs:capture:stop" }, "*");
  };

  const disconnected = status !== "connected";
  const statusLabel =
    status === "connected"
      ? "Connected to canvas"
      : status === "connecting"
        ? "Connecting…"
        : "DesignJS not running";

  return (
    <div
      className={cn(
        "designjs-popup-container",
        "flex flex-col overflow-hidden",
        "bg-card text-foreground",
        "rounded-xl border border-border",
        "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]",
      )}
      role="dialog"
      aria-label="DesignJS capture"
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-xs font-semibold tracking-tight whitespace-nowrap">
          DesignJS capture
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-xs)] text-muted-foreground">
            v0.1
          </span>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground text-sm w-5 h-5 inline-flex items-center justify-center rounded-sm hover:bg-accent transition-colors"
              aria-label="Close"
              title="Close (Esc)"
            >
              ×
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-2 text-[var(--text-sm)]">
          <StatusDot status={status} />
          <span>{statusLabel}</span>
        </div>

        {disconnected && (
          <p className="text-[var(--text-xs)] text-muted-foreground leading-relaxed m-0">
            Run{" "}
            <code className="px-1 py-0.5 rounded-sm bg-muted text-foreground font-mono text-[10px]">
              pnpm dev
            </code>{" "}
            in the DesignJS repo, then reopen this overlay.
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

      <footer className="px-4 py-2.5 bg-muted/50 text-[var(--text-xs)] text-muted-foreground text-center border-t border-border">
        Hover a web element and press{" "}
        <kbd className="px-1 py-0.5 rounded-sm bg-background border border-border font-mono text-[10px]">
          Enter
        </kbd>{" "}
        to capture.
      </footer>
    </div>
  );
}
