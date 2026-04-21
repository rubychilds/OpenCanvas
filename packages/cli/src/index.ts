#!/usr/bin/env node
import { detectIdes, planInit, printInitSummary, type IdeId } from "./init.js";

interface ParsedArgs {
  command: string;
  ides?: IdeId[];
  mcpCommand?: string[];
  name?: string;
  dryRun: boolean;
  showHelp: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const rest = [...argv];
  const command = rest.shift() ?? "help";
  const parsed: ParsedArgs = { command, dryRun: false, showHelp: false };
  while (rest.length > 0) {
    const arg = rest.shift()!;
    switch (arg) {
      case "--ide": {
        const value = rest.shift();
        if (!value) throw new Error("--ide requires a value");
        parsed.ides = value.split(",").map((v) => v.trim()) as IdeId[];
        break;
      }
      case "--name": {
        const value = rest.shift();
        if (!value) throw new Error("--name requires a value");
        parsed.name = value;
        break;
      }
      case "--mcp-command": {
        const value = rest.shift();
        if (!value) throw new Error("--mcp-command requires a value");
        parsed.mcpCommand = value.split(/\s+/);
        break;
      }
      case "--dry-run":
        parsed.dryRun = true;
        break;
      case "-h":
      case "--help":
        parsed.showHelp = true;
        break;
      default:
        throw new Error(`unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function printHelp(): void {
  console.log(`opencanvas — open-source MCP design canvas

Usage:
  opencanvas init [options]       Register the OpenCanvas MCP server with your
                                  AI agent(s). Writes an .mcp.json-style file
                                  per detected IDE.

Options:
  --ide <list>                    Comma-separated IDE targets: claude-code,
                                  cursor, vscode. Default: auto-detect.
  --name <name>                   Server name to register. Default: opencanvas.
  --mcp-command "<cmd>"           Override the server command string.
                                  Default: "npx -y @opencanvas/mcp-server".
  --dry-run                       Print the plan without writing files.
  -h, --help                      Show this help.

Examples:
  opencanvas init
  opencanvas init --ide claude-code
  opencanvas init --ide cursor,vscode --name my-canvas
  opencanvas init --mcp-command "pnpm --dir /path mcp"
`);
}

function main(): void {
  const argv = process.argv.slice(2);
  let args: ParsedArgs;
  try {
    args = parseArgs(argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    printHelp();
    process.exit(1);
  }

  if (args.showHelp || args.command === "help") {
    printHelp();
    return;
  }

  if (args.command === "init") {
    const cwd = process.cwd();
    if (!args.ides) {
      const detected = detectIdes(cwd);
      if (detected.length === 0) {
        console.log(
          "No IDE config dirs found (looked for .claude/.cursor/.vscode). Writing a generic .mcp.json.",
        );
      } else {
        console.log(`Detected IDEs: ${detected.join(", ")}`);
      }
    }
    const results = planInit({
      cwd,
      ides: args.ides,
      name: args.name,
      command: args.mcpCommand,
      write: !args.dryRun,
    });
    if (args.dryRun) {
      console.log("Dry run — no files written.");
    }
    printInitSummary(results, cwd);
    return;
  }

  console.error(`unknown command: ${args.command}`);
  printHelp();
  process.exit(1);
}

main();
