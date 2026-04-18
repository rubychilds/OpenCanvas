# Contributing to OpenCanvas

Thanks for your interest in contributing. This document covers local setup, coding conventions, and the PR process.

## Prerequisites

- **Node.js 20+** (LTS recommended)
- **pnpm 9+** (`corepack enable` then `corepack install -g pnpm@9` if you don't have it)
- A modern browser (Chrome, Firefox, Safari) for the canvas

## Local setup

```bash
git clone https://github.com/<org>/opencanvas.git
cd opencanvas
pnpm install
pnpm dev
```

`pnpm dev` rebuilds the `@opencanvas/bridge` package (so fresh protocol types land in `dist/`) then boots the Vite dev server for the canvas. The WebSocket bridge is embedded in the Vite process and listens on `127.0.0.1:29170`.

To run the MCP server standalone (useful for debugging agent connections):

```bash
pnpm mcp
```

## Workspace layout

```
opencanvas/
├── packages/
│   ├── app/          # Vite + React SPA hosting the GrapesJS canvas
│   ├── mcp-server/   # stdio MCP server process
│   └── bridge/       # shared WS protocol + Zod tool schemas
├── scripts/          # smoke tests and helpers
└── ...
```

When adding a new MCP tool:

1. Define input/output Zod schemas in [`packages/bridge/src/tools.ts`](./packages/bridge/src/tools.ts) and add it to `TOOL_SCHEMAS` + `TOOL_DESCRIPTIONS`.
2. Implement the handler in [`packages/app/src/bridge/handlers.ts`](./packages/app/src/bridge/handlers.ts) — it receives validated params and returns a result that matches the output schema.
3. Rebuild the bridge package: `pnpm --filter @opencanvas/bridge build` (or let `pnpm dev` do it).
4. The MCP server auto-registers it via `TOOL_SCHEMAS`.

## Running checks

```bash
pnpm typecheck              # all packages
pnpm --filter @opencanvas/bridge build
pnpm smoke:bridge           # WebSocket round-trip (no browser)
node scripts/smoke-mcp.mjs  # MCP stdio handshake + tools/list
```

The CI pipeline runs the same checks on every push and PR.

## Code conventions

- **TypeScript strict mode** — no implicit any, `noUncheckedIndexedAccess` enabled.
- **ESM only** — all packages are `"type": "module"`. Import with explicit `.js` extensions in relative paths.
- **Zod for all wire formats** — both the WS protocol and MCP tool I/O are validated at the boundary. Never skip parsing on incoming messages.
- **Small, orthogonal packages** — the bridge package is purely types and has no side effects. The app never imports from `mcp-server` and vice versa; they communicate only through the WS protocol.
- **Tool handlers are pure** (relative to the GrapesJS editor state) — they take params, call GrapesJS APIs, return a value. Don't stash state between calls.

## Pull request process

1. Fork the repo or create a branch from `main`.
2. Make your change with a focused commit history.
3. Run `pnpm typecheck` and both smoke tests — all must pass.
4. Open a PR describing **what** changed and **why**. Link any relevant PRD story.
5. CI must be green before merge.

## Reporting bugs / proposing features

Open a GitHub issue. For MCP tool requests, include:

- The agent workflow you're trying to unlock
- Proposed tool name, input, output
- Why an existing tool can't be combined to cover it

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
