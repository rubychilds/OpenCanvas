#!/usr/bin/env node
/**
 * Smoke test for the WebSocket bridge on port 29170.
 *
 * Simulates both sides of the bridge without a browser or MCP client:
 *   1. Connects as role=canvas (replies to any request with a stubbed ping result)
 *   2. Connects as role=mcp-server and sends a ping request
 *   3. Verifies the round-trip delivers the canvas's response to the mcp-server peer
 *
 * Exits 0 on success, 1 on failure.
 */
import WebSocket from "ws";
import { randomUUID } from "node:crypto";

const PORT = 29170;
const PATH = "/designjs-bridge";
const URL = `ws://localhost:${PORT}${PATH}`;
const TIMEOUT_MS = 5000;

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function openAs(role) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL);
    const timer = setTimeout(() => reject(new Error(`open timeout for ${role}`)), TIMEOUT_MS);
    ws.on("open", () => {
      clearTimeout(timer);
      ws.send(JSON.stringify({ type: "hello", role }));
      resolve(ws);
    });
    ws.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

async function main() {
  const canvas = await openAs("canvas");
  canvas.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type !== "request") return;
    const result = { pong: true, at: Date.now(), echo: msg.params };
    canvas.send(JSON.stringify({ type: "response", id: msg.id, ok: true, result }));
  });

  await wait(100);
  const mcp = await openAs("mcp-server");

  const id = randomUUID();
  const got = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("response timeout")), TIMEOUT_MS);
    mcp.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "response" && msg.id === id) {
        clearTimeout(timer);
        resolve(msg);
      }
    });
  });

  await wait(100);
  mcp.send(JSON.stringify({ type: "request", id, tool: "ping", params: { hello: "world" } }));

  const response = await got;
  canvas.close();
  mcp.close();

  if (!response.ok) throw new Error(`response not ok: ${JSON.stringify(response)}`);
  if (!response.result?.pong) throw new Error(`unexpected result: ${JSON.stringify(response)}`);
  console.log("OK round-trip:", JSON.stringify(response.result));
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
