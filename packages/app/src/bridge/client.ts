import {
  BRIDGE_HOST,
  BRIDGE_PATH,
  BRIDGE_PORT,
  BridgeMessage,
  type RequestMessage,
  type ResponseMessage,
} from "@designjs/bridge";

export type ToolHandler = (params: unknown) => Promise<unknown> | unknown;

export interface BridgeClientEvents {
  onStatus?: (connected: boolean) => void;
}

export class BridgeClient {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private disposed = false;

  constructor(
    private readonly handlers: Record<string, ToolHandler>,
    private readonly events: BridgeClientEvents = {},
  ) {}

  connect(): void {
    if (this.disposed) return;
    const url = `ws://${BRIDGE_HOST}:${BRIDGE_PORT}${BRIDGE_PATH}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.addEventListener("open", () => {
      this.reconnectAttempt = 0;
      ws.send(JSON.stringify({ type: "hello", role: "canvas" }));
      this.events.onStatus?.(true);
    });

    ws.addEventListener("message", (ev) => {
      void this.onMessage(ev.data);
    });

    ws.addEventListener("close", () => {
      this.events.onStatus?.(false);
      this.scheduleReconnect();
    });

    ws.addEventListener("error", () => {
      ws.close();
    });
  }

  dispose(): void {
    this.disposed = true;
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  private scheduleReconnect(): void {
    if (this.disposed) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 10_000);
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
  }

  private async onMessage(raw: unknown): Promise<void> {
    if (typeof raw !== "string") return;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    const parsed = BridgeMessage.safeParse(data);
    if (!parsed.success) return;
    if (parsed.data.type !== "request") return;
    const req = parsed.data as RequestMessage;

    let response: ResponseMessage;
    const handler = this.handlers[req.tool];
    if (!handler) {
      response = {
        type: "response",
        id: req.id,
        ok: false,
        error: `unknown tool: ${req.tool}`,
      };
    } else {
      try {
        const result = await handler(req.params);
        response = { type: "response", id: req.id, ok: true, result };
      } catch (err) {
        response = {
          type: "response",
          id: req.id,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
    this.ws?.send(JSON.stringify(response));
  }
}
