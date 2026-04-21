import WebSocket from "ws";
import { randomUUID } from "node:crypto";

const BRIDGE_URL = "ws://127.0.0.1:29170/designjs-bridge";

interface Pending {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

/**
 * Connects to the DesignJS WebSocket bridge as role="mcp-server" and provides
 * a single `call(tool, params)` method that correlates responses by id.
 *
 * Unlike the production MCP server (which wraps stdio), this client talks to
 * the bridge directly — sufficient for E2E tests because the bridge is the
 * only boundary we care about exercising alongside the browser-side tool
 * handlers.
 */
export class McpTestClient {
  private ws: WebSocket | null = null;
  private readonly pending = new Map<string, Pending>();

  async connect(timeoutMs = 5_000): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(BRIDGE_URL);
      const timer = setTimeout(() => reject(new Error("bridge connect timeout")), timeoutMs);
      ws.on("open", () => {
        clearTimeout(timer);
        ws.send(JSON.stringify({ type: "hello", role: "mcp-server" }));
        this.ws = ws;
        resolve();
      });
      ws.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      ws.on("message", (raw) => this.onMessage(raw.toString()));
    });
  }

  dispose(): void {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("mcp client disposed"));
    }
    this.pending.clear();
    try {
      this.ws?.close();
    } catch {
      // ignore
    }
    this.ws = null;
  }

  async call<T = unknown>(tool: string, params: unknown = {}, timeoutMs = 10_000): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("bridge not connected");
    }
    const id = randomUUID();
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`tool "${tool}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => resolve(v as T),
        reject,
        timer,
      });
      this.ws!.send(JSON.stringify({ type: "request", id, tool, params }));
    });
  }

  private onMessage(raw: string): void {
    let msg: { type?: string; id?: string; ok?: boolean; result?: unknown; error?: string };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.type !== "response" || !msg.id) return;
    const p = this.pending.get(msg.id);
    if (!p) return;
    this.pending.delete(msg.id);
    clearTimeout(p.timer);
    if (msg.ok) p.resolve(msg.result);
    else p.reject(new Error(msg.error ?? "unknown error"));
  }
}
