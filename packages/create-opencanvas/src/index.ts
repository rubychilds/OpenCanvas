#!/usr/bin/env node
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// dist/ lives next to template/ after build
const TEMPLATE_DIR = resolve(HERE, "..", "template");

interface ParsedArgs {
  target: string | null;
  help: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  let target: string | null = null;
  let help = false;
  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") {
      help = true;
      continue;
    }
    if (target === null && !arg.startsWith("-")) {
      target = arg;
    }
  }
  return { target, help };
}

const HELP_TEXT = `Usage: create-opencanvas <project-directory>

Scaffold a new OpenCanvas-wired project. Drops:
  .mcp.json     MCP config pointing at @designjs/mcp-server
  CLAUDE.md     agent guidance biasing toward the OpenCanvas tools
  README.md     quickstart + prerequisites

Typical flow:

  npm create opencanvas@latest my-app
  cd my-app
  claude                   # or cursor . / code .

The OpenCanvas canvas app itself must be running separately on
localhost:3000. See the generated README.md for setup.
`;

function copyRecursive(src: string, dest: string): void {
  const stat = readdirSync(src, { withFileTypes: true });
  mkdirSync(dest, { recursive: true });
  for (const entry of stat) {
    const s = join(src, entry.name);
    const d = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(s, d);
    } else {
      copyFileSync(s, d);
    }
  }
}

function substituteTokens(filePath: string, tokens: Record<string, string>): void {
  const raw = readFileSync(filePath, "utf8");
  let out = raw;
  for (const [k, v] of Object.entries(tokens)) {
    out = out.split(`__${k}__`).join(v);
  }
  if (out !== raw) writeFileSync(filePath, out, "utf8");
}

function main(): void {
  const { target, help } = parseArgs(process.argv.slice(2));
  if (help) {
    process.stdout.write(HELP_TEXT);
    return;
  }
  if (!target) {
    process.stderr.write(`error: missing project directory argument\n\n${HELP_TEXT}`);
    process.exit(1);
  }

  const dest = resolve(process.cwd(), target);
  if (existsSync(dest)) {
    const entries = readdirSync(dest);
    if (entries.length > 0) {
      process.stderr.write(
        `error: target directory '${target}' already exists and isn't empty\n`,
      );
      process.exit(1);
    }
  }

  if (!existsSync(TEMPLATE_DIR)) {
    process.stderr.write(
      `error: template directory not found at ${TEMPLATE_DIR}\n` +
        `(this usually means the package wasn't built; try 'pnpm build' in packages/create-opencanvas)\n`,
    );
    process.exit(1);
  }

  copyRecursive(TEMPLATE_DIR, dest);

  // Substitute tokens in template files. __PROJECT_NAME__ → the directory
  // name the user picked. Kept minimal — README is the only file that
  // interpolates today.
  const projectName = basename(dest);
  substituteTokens(join(dest, "README.md"), { PROJECT_NAME: projectName });

  const rel = target;
  process.stdout.write(`\n  ✨ Created ${projectName} at ${dest}\n\n`);
  process.stdout.write(`  Next steps:\n\n`);
  process.stdout.write(`    1. In another terminal, start OpenCanvas:\n`);
  process.stdout.write(`       git clone https://github.com/rubychilds/opencanvas.git\n`);
  process.stdout.write(`       cd opencanvas && pnpm install && pnpm dev\n\n`);
  process.stdout.write(`    2. Connect your agent:\n`);
  process.stdout.write(`       cd ${rel}\n`);
  process.stdout.write(`       claude                  # or cursor . / code .\n\n`);
  process.stdout.write(`    3. Prompt:\n`);
  process.stdout.write(
    `       "Create a Desktop artboard, then add a pricing section"\n\n`,
  );
}

main();
