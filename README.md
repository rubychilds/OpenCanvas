# OpenCanvas

**An open-source MCP design canvas that gives AI coding agents eyes.**

OpenCanvas is a local-first, HTML/CSS-native visual canvas that AI coding agents (Claude Code, Cursor, Codex) read and write through the [Model Context Protocol](https://modelcontextprotocol.io). Design and code converge into a single artifact — no translation gap between visual intent and production output.

> **Status:** early v0.1 in active development. Foundations — canvas, MCP server, WebSocket bridge — are working end-to-end. Polish and feature stories from the [roadmap](#roadmap) are in flight.

## Why

AI coding agents currently generate frontend UI **blind**. They produce React components from text prompts alone, with no ability to see a visual design, iterate spatially, or maintain layout relationships. Design engineers spend 2–4 hours a day in prompt → preview → re-prompt cycles getting agents to match their visual intent.

Two proprietary tools are closing this gap from different angles. **Paper.design** ships an HTML/CSS-native canvas — the design *is* the production code — but as a hosted SaaS product tied to its own backend. **Pencil.dev** ships a local-first, git-native canvas that any agent can drive over MCP — but the design file is a vector format in a closed renderer, not the HTML/CSS that ships to production. OpenCanvas combines both bets: **HTML/CSS-native like Paper, local-first and git-native like Pencil, MIT-licensed**, and built on open-source foundations (GrapesJS, the MCP TypeScript SDK, html-to-image).

## How it works

```
┌───────────────────┐     stdio      ┌─────────────────┐
│  Claude Code /    │──────────────▶│   MCP Server    │
│  Cursor / Codex   │     (JSON-RPC) │   (Node.js)     │
└───────────────────┘                └───────┬─────────┘
                                             │ WebSocket (127.0.0.1:29170)
                                             ▼
┌─────────────────────────────────────────────┐
│      Browser (Vite + React SPA)             │
│  ┌────────────┐  ┌───────────────────────┐  │
│  │ Editor UI  │  │  GrapesJS Canvas      │  │
│  │ (panels,   │  │  (iframe with         │  │
│  │  blocks,   │  │   real HTML/CSS       │  │
│  │  styles)   │  │   + Tailwind v4 CDN)  │  │
│  └────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────┘
                      │
              ┌───────┴───────┐
              │ .opencanvas   │
              │   .json       │
              └───────────────┘
```

Agent ↔ Canvas communication flows stdio → MCP server → WebSocket bridge → browser → GrapesJS API, with responses travelling back the same path. Both human edits and agent edits converge on the **same GrapesJS component model** — one source of truth.

## Quickstart

Requires **Node.js 20+** and **pnpm 9+**.

```bash
git clone https://github.com/<org>/opencanvas.git
cd opencanvas
pnpm install
pnpm dev
```

Opens the canvas at http://localhost:3000. The WebSocket bridge listens on `127.0.0.1:29170`. Connection status is visible top-right in the editor shell.

### Connect an AI agent

**Auto-configure (Claude Code / Cursor / VS Code):**

```bash
pnpm --filter @opencanvas/cli build       # one-time
node packages/cli/dist/index.js init      # detects IDE dirs, writes MCP config
```

This writes `.mcp.json` (Claude Code / generic), `.cursor/mcp.json`, or `.vscode/mcp.json` in the current project depending on which IDE config dirs are present. Use `--ide <name>` to pick explicitly. When published to npm, this becomes `npx opencanvas init`.

**Manual (Claude Code, user scope):**

```bash
claude mcp add opencanvas --scope user \
  -- pnpm --dir "$(pwd)" --filter @opencanvas/mcp-server start
```

Start a new Claude Code session, then `/mcp` should list `opencanvas` with all v0.1 tools.

## Packages

| Package | Purpose |
|---------|---------|
| [`packages/app`](./packages/app) | Vite + React SPA hosting the GrapesJS canvas. Embeds a WebSocket hub (port 29170) that relays messages between the MCP server and the browser. |
| [`packages/mcp-server`](./packages/mcp-server) | Standalone stdio MCP server. Registers all tools, forwards calls over WebSocket to the canvas. |
| [`packages/bridge`](./packages/bridge) | Shared Zod schemas for the WS wire protocol and MCP tool I/O. |
| [`packages/cli`](./packages/cli) | `opencanvas init` — detects the installed IDE(s) and writes the right MCP config. |

## MCP tools (v0.1)

| Tool | Purpose |
|------|---------|
| `ping` | Health check — returns `{ pong: true, at: <timestamp> }` when the canvas is connected. |
| `get_tree` | Recursive JSON component tree. |
| `get_html` | Clean HTML (optional `componentId` scope). |
| `get_css` | CSS stylesheet (optional `componentId` scope). |
| `get_screenshot` | PNG/JPEG base64 screenshot of the canvas iframe. |
| `get_selection` | Component IDs currently selected in the editor. |
| `add_components` | Insert raw HTML (Tailwind classes supported). |
| `update_styles` | Set CSS properties on a component by id. |
| `delete_nodes` | Remove components by id. |

See [`packages/bridge/src/tools.ts`](./packages/bridge/src/tools.ts) for exact input/output schemas.

## Comparison

| Tool | Canvas format | MCP | License |
|------|--------------|-----|---------|
| Paper.design | HTML/CSS + GPU shaders | Bidirectional (21 tools) | Proprietary |
| Pencil.dev | Vector (native) | Bidirectional (6 tools) | Proprietary |
| Figma | WASM vector engine | Read-only Dev Mode | Proprietary |
| Penpot | SVG | Community only | MPL-2.0 |
| GrapesJS | HTML/CSS iframe | None | BSD-3 |
| Onlook | Live React DOM | Own agent | Apache-2.0 |
| Webstudio | DOM (real CSS) | None | AGPL-3.0 |
| **OpenCanvas** | **HTML/CSS iframe (GrapesJS)** | **Open bidirectional** | **MIT** |

## Roadmap

### v0.1 — canvas + MCP foundation *(in progress, weeks 1–4)*

Core is functionally complete. Paste-import and 30-second demo assets are the remaining gaps.

**Shipped**
- [x] Three-pane editor shell — resizable panels, layers tree, style manager, traits, all keyboard shortcuts
- [x] GrapesJS canvas with Tailwind v4 (CDN in iframe) and flexbox controls
- [x] Block palette — 25 blocks across Layout / Typography / Form / Media (click-to-insert)
- [x] Save/load to `.opencanvas.json` — Cmd+S, 30s autosave, reload-restore, git-diffable
- [x] MCP server (stdio) + WebSocket bridge on `127.0.0.1:29170`, multi-peer routing
- [x] All 9 v0.1 MCP tools (`ping`, `get_tree`, `get_html`, `get_css`, `get_screenshot`, `get_selection`, `add_components`, `update_styles`, `delete_nodes`) — verified end-to-end via 14 Playwright specs
- [x] `opencanvas init` CLI — auto-detects Claude Code / Cursor / VS Code and writes the right MCP config
- [x] CI: typecheck, build, smoke tests (bridge round-trip, MCP stdio, init), Playwright E2E
- [x] Repo: MIT, CONTRIBUTING, RELEASING (Changesets), light + dark themes (Phase A of ADR-0001 — frontend UI stack)

**Remaining for v0.1**
- [ ] HTML/Tailwind clipboard paste import (Epic 3)
- [ ] `npm create opencanvas@latest` scaffolder
- [ ] Drag-to-canvas from React block palette (click-to-insert works today)
- [ ] User-extensible block config + custom Tailwind config loading
- [ ] Demo GIF, per-tool examples, troubleshooting docs (Epic 4)
- [ ] GitHub issue templates + Projects board

### v0.2 — artboards, export, polish *(weeks 5–8)*

Multi-artboard spatial canvas, pan/zoom, design tokens (`get_variables` / `set_variables`), `get_jsx` MCP tool, Figma copy-paste import, responsive preview, selection-overlay polish. Phase A of ADR-0001 (Tailwind v4 + shadcn/ui + tokens, all panels migrated, `NumberInput`) has already landed as prerequisite work.

### v0.3 — extension, multi-agent, IDE *(weeks 9–12)*

Chrome extension for site capture (DOM walk + computed-style serialization), concurrent MCP sessions with workspace isolation (foundation already in the bridge), VS Code custom editor for `.opencanvas.json`, shadcn/ui block library.

Detailed stories and acceptance criteria live in the PRD (not checked in).

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Releasing

Maintainer workflow for publishing releases: see [RELEASING.md](./RELEASING.md).

## License

MIT — see [LICENSE](./LICENSE).
