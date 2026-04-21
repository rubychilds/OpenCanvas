import type { Plugin } from "vite";
import { WebSocketServer, type WebSocket } from "ws";
import {
  BRIDGE_HOST,
  BRIDGE_PATH,
  BRIDGE_PORT,
  BridgeMessage,
  type BridgeRole,
} from "@designjs/bridge";

interface Peer {
  role: BridgeRole;
  socket: WebSocket;
}

/**
 * Runs a WebSocket hub on BRIDGE_PORT that relays messages between the MCP
 * server process(es) (role: "mcp-server") and the browser canvas (role:
 * "canvas"). The canvas is single; any number of mcp-server peers may connect
 * concurrently. Requests are forwarded to the canvas along with the requester's
 * socket, and responses are routed back to the originating mcp-server peer by
 * pending request id.
 */
export function bridgeServerPlugin(): Plugin {
  let wss: WebSocketServer | null = null;
  const peers = new Map<WebSocket, Peer>();
  /** requestId → socket that sent the request, for response routing. */
  const pending = new Map<string, WebSocket>();

  const peerByRole = (role: BridgeRole): Peer | undefined => {
    for (const p of peers.values()) if (p.role === role) return p;
    return undefined;
  };

  const start = () => {
    if (wss) return;
    wss = new WebSocketServer({ host: BRIDGE_HOST, port: BRIDGE_PORT, path: BRIDGE_PATH });

    wss.on("listening", () => {
      console.log(
        `[opencanvas:bridge] listening on ws://${BRIDGE_HOST}:${BRIDGE_PORT}${BRIDGE_PATH}`,
      );
    });

    wss.on("error", (err) => {
      console.error("[opencanvas:bridge] server error:", err);
    });

    wss.on("connection", (socket) => {
      socket.on("message", (raw) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw.toString());
        } catch {
          return;
        }
        const msg = BridgeMessage.safeParse(parsed);
        if (!msg.success) return;

        if (msg.data.type === "hello") {
          // Canvas is singleton — new canvas kicks out the previous one.
          // mcp-server peers are multiplexed; multiple may connect concurrently.
          if (msg.data.role === "canvas") {
            const existing = peerByRole("canvas");
            if (existing && existing.socket !== socket) {
              existing.socket.close(4000, "replaced by new canvas");
              peers.delete(existing.socket);
            }
          }
          peers.set(socket, { role: msg.data.role, socket });
          console.log(`[opencanvas:bridge] peer connected: ${msg.data.role}`);
          return;
        }

        const me = peers.get(socket);
        if (!me) return;

        if (msg.data.type === "request" && me.role === "mcp-server") {
          const canvas = peerByRole("canvas");
          if (!canvas) {
            const error = {
              type: "response" as const,
              id: msg.data.id,
              ok: false as const,
              error: "canvas not connected",
            };
            socket.send(JSON.stringify(error));
            return;
          }
          pending.set(msg.data.id, socket);
          canvas.socket.send(raw.toString());
          return;
        }

        if (msg.data.type === "response" && me.role === "canvas") {
          const target = pending.get(msg.data.id);
          if (!target) return;
          pending.delete(msg.data.id);
          if (target.readyState === target.OPEN) {
            target.send(raw.toString());
          }
          return;
        }
      });

      socket.on("close", () => {
        const me = peers.get(socket);
        if (me) console.log(`[opencanvas:bridge] peer disconnected: ${me.role}`);
        peers.delete(socket);
        // Drop any pending requests originating from this socket — no one left
        // to receive the response.
        for (const [id, sender] of pending) {
          if (sender === socket) pending.delete(id);
        }
      });
    });
  };

  const stop = () => {
    if (!wss) return;
    for (const { socket } of peers.values()) socket.close();
    peers.clear();
    pending.clear();
    wss.close();
    wss = null;
  };

  return {
    name: "opencanvas-bridge-server",
    apply: "serve",
    configureServer() {
      start();
    },
    buildEnd() {
      stop();
    },
    closeBundle() {
      stop();
    },
  };
}
