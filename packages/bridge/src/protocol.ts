import { z } from "zod";

export const BRIDGE_PORT = 29170;
export const BRIDGE_HOST = "127.0.0.1";
export const BRIDGE_PATH = "/designjs-bridge";

export const BridgeRole = z.enum(["mcp-server", "canvas", "browser-extension"]);
export type BridgeRole = z.infer<typeof BridgeRole>;

export const HelloMessage = z.object({
  type: z.literal("hello"),
  role: BridgeRole,
  sessionId: z.string().optional(),
});
export type HelloMessage = z.infer<typeof HelloMessage>;

export const RequestMessage = z.object({
  type: z.literal("request"),
  id: z.string(),
  tool: z.string(),
  params: z.unknown(),
});
export type RequestMessage = z.infer<typeof RequestMessage>;

export const ResponseMessage = z.discriminatedUnion("ok", [
  z.object({
    type: z.literal("response"),
    id: z.string(),
    ok: z.literal(true),
    result: z.unknown(),
  }),
  z.object({
    type: z.literal("response"),
    id: z.string(),
    ok: z.literal(false),
    error: z.string(),
  }),
]);
export type ResponseMessage = z.infer<typeof ResponseMessage>;

export const BridgeMessage = z.union([HelloMessage, RequestMessage, ResponseMessage]);
export type BridgeMessage = z.infer<typeof BridgeMessage>;
