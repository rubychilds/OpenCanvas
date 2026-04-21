#!/usr/bin/env node
/**
 * Smoke test for `opencanvas init` (Story 2.9):
 *   - no-IDE default writes .mcp.json
 *   - --ide claude-code writes .mcp.json
 *   - --ide cursor writes .cursor/mcp.json
 *   - --ide vscode writes .vscode/mcp.json
 *   - running init twice over the same file is idempotent (action: unchanged)
 *   - an existing mcpServers entry is merged, not replaced
 *
 * Uses the CLI via `tsx` against src/index.ts so we don't depend on a build.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const repoRoot = resolve(new URL(".", import.meta.url).pathname, "..");
const cliDist = resolve(repoRoot, "packages/cli/dist/index.js");

if (!existsSync(cliDist)) {
  console.error(`CLI not built — run 'pnpm --filter @designjs/cli build' first`);
  process.exit(2);
}

function run(cwd, args) {
  return spawnSync(process.execPath, [cliDist, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} mismatch:\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const cases = [];

function tmpProject() {
  return mkdtempSync(join(tmpdir(), "opencanvas-init-"));
}

cases.push({
  name: "default (no IDE) writes .mcp.json",
  run() {
    const dir = tmpProject();
    const res = run(dir, ["init"]);
    if (res.status !== 0) throw new Error(`init failed: ${res.stderr}\n${res.stdout}`);
    const json = readJson(join(dir, ".mcp.json"));
    assertEqual(json.mcpServers.opencanvas, { command: "npx", args: ["-y", "@designjs/mcp-server"] }, "default entry");
    rmSync(dir, { recursive: true });
  },
});

cases.push({
  name: "explicit --ide cursor writes .cursor/mcp.json",
  run() {
    const dir = tmpProject();
    const res = run(dir, ["init", "--ide", "cursor"]);
    if (res.status !== 0) throw new Error(`init failed: ${res.stderr}`);
    const json = readJson(join(dir, ".cursor/mcp.json"));
    if (!json.mcpServers.opencanvas) throw new Error("opencanvas entry missing");
    rmSync(dir, { recursive: true });
  },
});

cases.push({
  name: "auto-detect picks up .vscode dir",
  run() {
    const dir = tmpProject();
    mkdirSync(join(dir, ".vscode"));
    const res = run(dir, ["init"]);
    if (res.status !== 0) throw new Error(`init failed: ${res.stderr}`);
    const json = readJson(join(dir, ".vscode/mcp.json"));
    if (!json.mcpServers.opencanvas) throw new Error("opencanvas entry missing from vscode config");
    rmSync(dir, { recursive: true });
  },
});

cases.push({
  name: "second run is idempotent (unchanged)",
  run() {
    const dir = tmpProject();
    run(dir, ["init", "--ide", "claude-code"]);
    const second = run(dir, ["init", "--ide", "claude-code"]);
    if (!second.stdout.includes("unchanged") && !second.stdout.includes("·")) {
      throw new Error(`expected unchanged marker, got:\n${second.stdout}`);
    }
    rmSync(dir, { recursive: true });
  },
});

cases.push({
  name: "merges into existing mcpServers without clobbering siblings",
  run() {
    const dir = tmpProject();
    writeFileSync(
      join(dir, ".mcp.json"),
      JSON.stringify({ mcpServers: { existing: { command: "echo", args: ["hi"] } } }, null, 2),
    );
    const res = run(dir, ["init", "--ide", "claude-code"]);
    if (res.status !== 0) throw new Error(`init failed: ${res.stderr}`);
    const json = readJson(join(dir, ".mcp.json"));
    assertEqual(json.mcpServers.existing, { command: "echo", args: ["hi"] }, "existing entry preserved");
    if (!json.mcpServers.opencanvas) throw new Error("opencanvas entry not added");
    rmSync(dir, { recursive: true });
  },
});

cases.push({
  name: "--mcp-command override is honored",
  run() {
    const dir = tmpProject();
    const res = run(dir, ["init", "--ide", "claude-code", "--mcp-command", "pnpm mcp"]);
    if (res.status !== 0) throw new Error(`init failed: ${res.stderr}`);
    const json = readJson(join(dir, ".mcp.json"));
    assertEqual(json.mcpServers.opencanvas, { command: "pnpm", args: ["mcp"] }, "command override");
    rmSync(dir, { recursive: true });
  },
});

cases.push({
  name: "--dry-run writes nothing",
  run() {
    const dir = tmpProject();
    const res = run(dir, ["init", "--ide", "claude-code", "--dry-run"]);
    if (res.status !== 0) throw new Error(`init failed: ${res.stderr}`);
    try {
      readJson(join(dir, ".mcp.json"));
      throw new Error("file should not exist after --dry-run");
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
    rmSync(dir, { recursive: true });
  },
});

let failed = 0;
for (const c of cases) {
  try {
    c.run();
    console.log(`OK  ${c.name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${c.name}: ${err.message}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} of ${cases.length} failed`);
  process.exit(1);
}
console.log(`\nAll ${cases.length} init cases passed.`);
