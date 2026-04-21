#!/usr/bin/env node
/**
 * Smoke test for `create-opencanvas`. Mirrors scripts/smoke-init.mjs — runs
 * the built binary against temp directories and asserts the scaffolded
 * output shape.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = resolve(HERE, "..", "packages", "create-opencanvas", "dist", "index.js");

if (!existsSync(BIN)) {
  process.stderr.write(
    `smoke-create: binary not found at ${BIN}\n  run: pnpm -F create-opencanvas build\n`,
  );
  process.exit(1);
}

function tmpBase() {
  return mkdtempSync(join(tmpdir(), "oc-create-"));
}

function run(cwd, args) {
  return spawnSync("node", [BIN, ...args], { cwd, encoding: "utf8" });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assert(cond, msg) {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

function assertEqual(a, b, msg) {
  const aa = JSON.stringify(a);
  const bb = JSON.stringify(b);
  if (aa !== bb) throw new Error(`assertion failed: ${msg}\n  expected ${bb}\n  got      ${aa}`);
}

const cases = [];

cases.push({
  name: "scaffolds .mcp.json + CLAUDE.md + README.md",
  run() {
    const base = tmpBase();
    const res = run(base, ["my-project"]);
    if (res.status !== 0) throw new Error(`create failed: ${res.stderr}\n${res.stdout}`);
    const dir = join(base, "my-project");
    assert(existsSync(join(dir, ".mcp.json")), ".mcp.json present");
    assert(existsSync(join(dir, "CLAUDE.md")), "CLAUDE.md present");
    assert(existsSync(join(dir, "README.md")), "README.md present");
    const mcp = readJson(join(dir, ".mcp.json"));
    assertEqual(
      mcp.mcpServers.opencanvas,
      { command: "npx", args: ["-y", "@designjs/mcp-server"] },
      "mcp config points at @designjs/mcp-server",
    );
    rmSync(base, { recursive: true });
  },
});

cases.push({
  name: "__PROJECT_NAME__ token interpolates into README",
  run() {
    const base = tmpBase();
    const res = run(base, ["cool-thing"]);
    if (res.status !== 0) throw new Error(`create failed: ${res.stderr}\n${res.stdout}`);
    const readme = readFileSync(join(base, "cool-thing", "README.md"), "utf8");
    assert(readme.startsWith("# cool-thing"), "README has interpolated project name");
    assert(!readme.includes("__PROJECT_NAME__"), "no unreplaced tokens remain");
    rmSync(base, { recursive: true });
  },
});

cases.push({
  name: "errors when target already exists and is non-empty",
  run() {
    const base = tmpBase();
    const target = join(base, "existing");
    mkdirSync(target);
    writeFileSync(join(target, "some-file"), "hi");
    const res = run(base, ["existing"]);
    assertEqual(res.status, 1, "exits 1");
    assert(/already exists/.test(res.stderr), "error mentions 'already exists'");
    rmSync(base, { recursive: true });
  },
});

cases.push({
  name: "empty existing target is accepted",
  run() {
    const base = tmpBase();
    const target = join(base, "empty");
    mkdirSync(target);
    const res = run(base, ["empty"]);
    if (res.status !== 0) throw new Error(`create failed: ${res.stderr}\n${res.stdout}`);
    assert(existsSync(join(target, ".mcp.json")), "scaffold wrote into empty dir");
    rmSync(base, { recursive: true });
  },
});

cases.push({
  name: "missing arg errors with exit 1",
  run() {
    const base = tmpBase();
    const res = run(base, []);
    assertEqual(res.status, 1, "exits 1");
    assert(/missing project directory/.test(res.stderr), "error mentions missing arg");
    rmSync(base, { recursive: true });
  },
});

cases.push({
  name: "--help prints usage and exits 0",
  run() {
    const base = tmpBase();
    const res = run(base, ["--help"]);
    assertEqual(res.status, 0, "exits 0");
    assert(/Usage: create-opencanvas/.test(res.stdout), "stdout shows usage");
    // Help should NOT mention an error.
    assertEqual(res.stderr, "", "no stderr output");
    rmSync(base, { recursive: true });
  },
});

let passed = 0;
let failed = 0;
for (const c of cases) {
  try {
    c.run();
    process.stdout.write(`OK  ${c.name}\n`);
    passed += 1;
  } catch (err) {
    process.stdout.write(`FAIL ${c.name}\n  ${err.message}\n`);
    failed += 1;
  }
}

process.stdout.write(`\n${passed + failed} cases: ${passed} passed, ${failed} failed.\n`);
process.exit(failed > 0 ? 1 : 0);
