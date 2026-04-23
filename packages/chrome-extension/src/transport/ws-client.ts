/**
 * WebSocket client to the DesignJS canvas bridge.
 *
 * Per ADR-0011 §1: the extension is a `browser-extension` peer on the
 * existing `ws://127.0.0.1:29170/designjs-bridge` multi-peer protocol.
 * No HTTP relay, no MCP-server dependency — the extension talks to the
 * canvas directly.
 *
 * TODO for implementation:
 * - Hello handshake: `{ type: "hello", peer: "browser-extension" }`
 * - Request/response correlation via message ids (same scheme the MCP
 *   server uses — see packages/bridge/src/protocol.ts).
 * - Exponential backoff on reconnect (1s, 2s, 4s, 8s, max 30s), matching
 *   the PRD Story 2.2 bridge reliability bar.
 * - Surface connection state via the `onStatus` hook so the popup can
 *   show a "DesignJS not running" banner when disconnected.
 */

export type BridgeStatus = "connected" | "connecting" | "disconnected";

export interface ConnectOptions {
  url?: string;
  onStatus?: (status: BridgeStatus) => void;
}

export interface BridgeConnection {
  send(payload: Record<string, unknown>): Promise<unknown>;
  currentStatus(): BridgeStatus;
  dispose(): void;
}

const DEFAULT_URL = "ws://127.0.0.1:29170/designjs-bridge";

export function connectToBridge(opts: ConnectOptions = {}): BridgeConnection {
  const url = opts.url ?? DEFAULT_URL;
  let status: BridgeStatus = "disconnected";

  // TODO: implement the full WebSocket lifecycle per ADR-0011 §1.
  // Stub for compilation only.
  void url;
  opts.onStatus?.(status);

  return {
    send: async () => {
      throw new Error("ws-client: not implemented");
    },
    currentStatus: () => status,
    dispose: () => {
      /* no-op stub */
    },
  };
}
