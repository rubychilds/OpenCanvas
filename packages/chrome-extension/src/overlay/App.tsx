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

type CaptureError =
  | "too-large"
  | "bridge-disconnected"
  | "empty-input"
  | "cancelled"
  | "unknown";

type CaptureState =
  | { kind: "idle" }
  | { kind: "capturing" }
  | { kind: "sending"; nodeCount: number; byteCount: number }
  | { kind: "sent"; nodeCount: number; byteCount: number }
  | { kind: "error"; error: CaptureError };

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
  const [capture, setCapture] = useState<CaptureState>({ kind: "idle" });

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "bridge-status:request" }, (res) => {
      if (res?.status) setStatus(res.status);
    });
    const bgListener = (msg: { type: string; status?: BridgeStatus }) => {
      if (msg.type === "bridge-status" && msg.status) setStatus(msg.status);
    };
    chrome.runtime.onMessage.addListener(bgListener);

    const winListener = (ev: MessageEvent) => {
      if (ev.source !== window) return;
      const data = ev.data as
        | {
            type: "designjs:capture:progress";
            phase: "sending";
            nodeCount: number;
            byteCount: number;
          }
        | {
            type: "designjs:capture:result";
            ok: boolean;
            error?: string;
            nodeCount?: number;
            byteCount?: number;
          };
      if (data?.type === "designjs:capture:progress" && data.phase === "sending") {
        setCapture({
          kind: "sending",
          nodeCount: data.nodeCount,
          byteCount: data.byteCount,
        });
        return;
      }
      if (data?.type === "designjs:capture:result") {
        if (data.ok) {
          setCapture({
            kind: "sent",
            nodeCount: data.nodeCount ?? 0,
            byteCount: data.byteCount ?? 0,
          });
          window.setTimeout(() => setCapture({ kind: "idle" }), 2500);
        } else {
          setCapture({
            kind: "error",
            error: (data.error as CaptureError) ?? "unknown",
          });
        }
      }
    };
    window.addEventListener("message", winListener);

    return () => {
      chrome.runtime.onMessage.removeListener(bgListener);
      window.removeEventListener("message", winListener);
    };
  }, []);

  const start = () => {
    setCapture({ kind: "capturing" });
    window.postMessage({ type: "designjs:capture:start" }, "*");
  };

  const stop = () => {
    setCapture({ kind: "idle" });
    window.postMessage({ type: "designjs:capture:stop" }, "*");
  };

  const disconnected = status !== "connected";
  const capturing = capture.kind === "capturing";
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
      <header className="flex h-9 items-center justify-between px-3 border-b border-border">
        <div
          className="font-semibold tracking-tight whitespace-nowrap"
          style={{ fontSize: "11px", lineHeight: "1" }}
        >
          DesignJS capture
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground w-5 h-5 inline-flex items-center justify-center rounded-sm hover:bg-accent transition-colors"
            style={{ fontSize: "14px", lineHeight: "1" }}
            aria-label="Close"
            title="Close (Esc)"
          >
            ×
          </button>
        )}
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
          disabled={disconnected || capture.kind === "sending"}
          fullWidth
          variant={capturing ? "outline" : "default"}
        >
          {capture.kind === "sending"
            ? "Sending…"
            : capturing
              ? "Stop capture"
              : "Start capture"}
        </Button>

        {capturing && (
          <p className="text-[var(--text-xs)] text-muted-foreground leading-relaxed m-0">
            Hover any element on the page.{" "}
            <kbd className="px-1 py-0.5 rounded-sm bg-background border border-border font-mono text-[10px]">
              ↑↓←→
            </kbd>{" "}
            to navigate the tree,{" "}
            <kbd className="px-1 py-0.5 rounded-sm bg-background border border-border font-mono text-[10px]">
              Enter
            </kbd>{" "}
            to capture,{" "}
            <kbd className="px-1 py-0.5 rounded-sm bg-background border border-border font-mono text-[10px]">
              Esc
            </kbd>{" "}
            to exit.
          </p>
        )}

        {capture.kind === "sent" && (
          <div
            className="rounded-sm border px-2.5 py-2 text-[var(--text-xs)]"
            style={{
              borderColor: "color-mix(in oklch, var(--color-oc-success) 30%, transparent)",
              background: "color-mix(in oklch, var(--color-oc-success) 5%, transparent)",
              color: "var(--color-oc-success)",
            }}
          >
            Sent to canvas — {capture.nodeCount} nodes,{" "}
            {(capture.byteCount / 1024).toFixed(1)} KB
          </div>
        )}

        {capture.kind === "error" && (
          <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-[var(--text-xs)] text-destructive">
            {capture.error === "too-large"
              ? "Selection too large. Try capturing a smaller section."
              : capture.error === "bridge-disconnected"
                ? "Lost connection to DesignJS. Check that pnpm dev is still running."
                : capture.error === "empty-input"
                  ? "Nothing captured. Try selecting a different element."
                  : capture.error === "cancelled"
                    ? "Capture cancelled."
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
