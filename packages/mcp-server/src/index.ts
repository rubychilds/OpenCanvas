#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TOOL_SCHEMAS, TOOL_DESCRIPTIONS, type ToolName } from "@designjs/bridge";
import { BridgeClient } from "./bridge-client.js";

const log = (msg: string) => process.stderr.write(`[opencanvas-mcp] ${msg}\n`);

async function main() {
  const bridge = new BridgeClient({ log });
  bridge.connect();

  const server = new McpServer({
    name: "opencanvas",
    version: "0.1.0",
  });

  for (const [name, schemas] of Object.entries(TOOL_SCHEMAS)) {
    const toolName = name as ToolName;
    server.registerTool(
      toolName,
      {
        title: toolName,
        description: TOOL_DESCRIPTIONS[toolName],
        inputSchema: schemas.input.shape,
      },
      async (args: unknown) => {
        const result = await bridge.call(toolName, args ?? {});
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      },
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("mcp server ready on stdio");

  const shutdown = async () => {
    log("shutting down");
    bridge.dispose();
    await server.close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  log(`fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
