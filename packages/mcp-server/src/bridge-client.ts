import { WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import {
  BRIDGE_HOST,
  BRIDGE_PATH,
  BRIDGE_PORT,
  BridgeMessage,
  type RequestMessage,
} from "@designjs/bridge";

interface Pending {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

export interface BridgeClientOptions {
  requestTimeoutMs?: number;
  log?: (msg: string) => void;
}

/**
 * WebSocket client used by the MCP server process to reach the browser canvas
 * through the Vite-hosted bridge hub. Responsibilities: connect with exponential
 * backoff, correlate requests to responses by id, surface timeouts.
 */
export class BridgeClient {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private disposed = false;
  private readonly pending = new Map<string, Pending>();
  private readonly requestTimeoutMs: number;
  private readonly log: (msg: string) => void;

  constructor(opts: BridgeClientOptions = {}) {
    this.requestTimeoutMs = opts.requestTimeoutMs ?? 10_000;
    this.log = opts.log ?? (() => {});
  }

  connect(): void {
    if (this.disposed) return;
    const url = `ws://${BRIDGE_HOST}:${BRIDGE_PORT}${BRIDGE_PATH}`;
    this.log(`bridge connect attempt → ${url}`);
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      this.reconnectAttempt = 0;
      ws.send(JSON.stringify({ type: "hello", role: "mcp-server" }));
      this.log(`bridge connected: ${url}`);
    });

    ws.on("message", (raw) => this.onMessage(raw.toString()));

    ws.on("close", (code, reason) => {
      this.log(`bridge disconnected (code=${code}${reason?.length ? `, reason=${reason.toString()}` : ""})`);
      this.scheduleReconnect();
    });

    ws.on("error", (err) => {
      this.log(`bridge ws error: ${err instanceof Error ? err.message : String(err)}`);
      try {
        ws.close();
      } catch {
        // ignore
      }
    });
  }

  dispose(): void {
    this.disposed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("bridge disposed"));
    }
    this.pending.clear();
    try {
      this.ws?.close();
    } catch {
      // ignore
    }
    this.ws = null;
  }

  async call(tool: string, params: unknown): Promise<unknown> {
    await this.waitForOpen(3000);
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("bridge not connected (is the canvas dev server running on port 29170?)"));
        return;
      }
      const id = randomUUID();
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`tool "${tool}" timed out after ${this.requestTimeoutMs}ms`));
      }, this.requestTimeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      const req: RequestMessage = { type: "request", id, tool, params };
      this.ws.send(JSON.stringify(req));
    });
  }

  private waitForOpen(maxWaitMs: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) return resolve();
      const deadline = Date.now() + maxWaitMs;
      const tick = () => {
        if (this.disposed) return resolve();
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return resolve();
        if (Date.now() >= deadline) return resolve();
        setTimeout(tick, 100);
      };
      tick();
    });
  }

  private scheduleReconnect(): void {
    if (this.disposed) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 10_000);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private onMessage(raw: string): void {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    const parsed = BridgeMessage.safeParse(data);
    if (!parsed.success) return;
    if (parsed.data.type !== "response") return;
    const resp = parsed.data;
    const pending = this.pending.get(resp.id);
    if (!pending) return;
    this.pending.delete(resp.id);
    clearTimeout(pending.timer);
    if (resp.ok) pending.resolve(resp.result);
    else pending.reject(new Error(resp.error));
  }
}
