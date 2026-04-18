import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

export type IdeId = "claude-code" | "cursor" | "vscode";

export interface InitOptions {
  /** Working directory the init runs in. Defaults to process.cwd(). */
  cwd?: string;
  /** Explicit IDE targets. Defaults to everything we can auto-detect. */
  ides?: IdeId[];
  /** Override the MCP server command. Defaults to `npx -y opencanvas-mcp`. */
  command?: string[];
  /** Name to register the MCP server under. Defaults to "opencanvas". */
  name?: string;
  /** If false, skip writing and just return the plan. */
  write?: boolean;
}

export interface InitResult {
  ide: IdeId;
  file: string;
  action: "created" | "updated" | "unchanged";
}

const IDE_FILES: Record<IdeId, string> = {
  "claude-code": ".mcp.json",
  cursor: ".cursor/mcp.json",
  vscode: ".vscode/mcp.json",
};

const IDE_SIGNALS: Record<IdeId, string[]> = {
  "claude-code": [".mcp.json", "CLAUDE.md", ".claude"],
  cursor: [".cursor"],
  vscode: [".vscode"],
};

export function detectIdes(cwd: string): IdeId[] {
  const found: IdeId[] = [];
  for (const ide of Object.keys(IDE_SIGNALS) as IdeId[]) {
    for (const signal of IDE_SIGNALS[ide]) {
      if (existsSync(join(cwd, signal))) {
        found.push(ide);
        break;
      }
    }
  }
  return found;
}

export function planInit(options: InitOptions = {}): InitResult[] {
  const cwd = resolve(options.cwd ?? process.cwd());
  const ides = options.ides ?? (() => {
    const detected = detectIdes(cwd);
    return detected.length > 0 ? detected : (["claude-code"] as IdeId[]);
  })();
  const name = options.name ?? "opencanvas";
  const command = options.command ?? ["npx", "-y", "opencanvas-mcp"];

  const results: InitResult[] = [];
  for (const ide of ides) {
    const filePath = resolve(cwd, IDE_FILES[ide]);
    const action = mergeMcpConfig(filePath, name, command, options.write !== false);
    results.push({ ide, file: filePath, action });
  }
  return results;
}

function mergeMcpConfig(
  filePath: string,
  name: string,
  command: string[],
  doWrite: boolean,
): InitResult["action"] {
  const [cmd, ...args] = command;
  const entry = { command: cmd, args };

  let existing: { mcpServers?: Record<string, unknown> } | null = null;
  let existedBefore = false;
  if (existsSync(filePath)) {
    existedBefore = true;
    try {
      existing = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      existing = null;
    }
  }

  const next = { ...(existing ?? {}) };
  next.mcpServers = { ...(existing?.mcpServers ?? {}), [name]: entry };

  const alreadyEqual =
    existedBefore &&
    JSON.stringify((existing as { mcpServers?: Record<string, unknown> })?.mcpServers?.[name]) ===
      JSON.stringify(entry);

  if (alreadyEqual) return "unchanged";
  if (doWrite) {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(next, null, 2) + "\n", "utf8");
  }
  return existedBefore ? "updated" : "created";
}

export function printInitSummary(results: InitResult[], cwd: string): void {
  for (const r of results) {
    const rel = relative(cwd, r.file) || r.file;
    console.log(`${prefix(r.action)} ${r.ide.padEnd(12)} → ${rel}`);
  }
  console.log();
  console.log("Restart your agent to pick up the new MCP server.");
}

function prefix(action: InitResult["action"]): string {
  switch (action) {
    case "created":
      return "+";
    case "updated":
      return "~";
    case "unchanged":
      return "·";
  }
}
