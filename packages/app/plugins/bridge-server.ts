import type { Plugin } from "vite";
import { WebSocketServer, type WebSocket } from "ws";
import {
  BRIDGE_HOST,
  BRIDGE_PATH,
  BRIDGE_PORT,
  BridgeMessage,
  type BridgeRole,
} from "@opencanvas/bridge";

interface Peer {
  role: BridgeRole;
  socket: WebSocket;
}

/**
 * Runs a WebSocket hub on BRIDGE_PORT that relays messages between the MCP
 * server process (role: "mcp-server") and the browser canvas (role: "canvas").
 * Requests from mcp-server → canvas; responses from canvas → mcp-server.
 */
export function bridgeServerPlugin(): Plugin {
  let wss: WebSocketServer | null = null;
  const peers = new Map<WebSocket, Peer>();

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
          const existing = peerByRole(msg.data.role);
          if (existing && existing.socket !== socket) {
            existing.socket.close(4000, "replaced by new peer");
            peers.delete(existing.socket);
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
          canvas.socket.send(raw.toString());
          return;
        }

        if (msg.data.type === "response" && me.role === "canvas") {
          const mcp = peerByRole("mcp-server");
          if (!mcp) return;
          mcp.socket.send(raw.toString());
          return;
        }
      });

      socket.on("close", () => {
        const me = peers.get(socket);
        if (me) console.log(`[opencanvas:bridge] peer disconnected: ${me.role}`);
        peers.delete(socket);
      });
    });
  };

  const stop = () => {
    if (!wss) return;
    for (const { socket } of peers.values()) socket.close();
    peers.clear();
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
