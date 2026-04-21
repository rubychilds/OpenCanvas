# DesignJS

**An open-source MCP design canvas that gives AI coding agents eyes.**

DesignJS is a local-first, HTML/CSS-native visual canvas that AI coding agents (Claude Code, Cursor, Codex) read and write through the [Model Context Protocol](https://modelcontextprotocol.io). Design and code converge into a single artifact — no translation gap between visual intent and production output.

> **Status:** early v0.1 in active development. Foundations — canvas, MCP server, WebSocket bridge — are working end-to-end. Polish and feature stories from the [roadmap](#roadmap) are in flight.

## Why

AI coding agents currently generate frontend UI **blind**. They produce React components from text prompts alone, with no ability to see a visual design, iterate spatially, or maintain layout relationships. Design engineers spend 2–4 hours a day in prompt → preview → re-prompt cycles getting agents to match their visual intent.

Two proprietary tools are closing this gap from different angles. **Paper.design** ships an HTML/CSS-native canvas — the design *is* the production code — but as a hosted SaaS product tied to its own backend. **Pencil.dev** ships a local-first, git-native canvas that any agent can drive over MCP — but the design file is a vector format in a closed renderer, not the HTML/CSS that ships to production. DesignJS combines both bets: **HTML/CSS-native like Paper, local-first and git-native like Pencil, MIT-licensed**, and built on open-source foundations (GrapesJS, the MCP TypeScript SDK, html-to-image).

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
              │ .designjs   │
              │   .json       │
              └───────────────┘
```

Agent ↔ Canvas communication flows stdio → MCP server → WebSocket bridge → browser → GrapesJS API, with responses travelling back the same path. Both human edits and agent edits converge on the **same GrapesJS component model** — one source of truth.

## Quickstart

Requires **Node.js 20+**.

### 1. Start the canvas

The canvas app runs locally (it's not hosted). Two ways:

**From source** (recommended while v0.2 is in development — get all the latest):

```bash
git clone https://github.com/rubychilds/DesignJS.git
cd DesignJS
pnpm install
pnpm dev
```

Opens at <http://localhost:3000>. The WebSocket bridge listens on `127.0.0.1:29170`. Connection status is visible top-right in the editor shell.

### 2. Scaffold a project (or use one you already have)

```bash
npm create designjs@latest my-app
cd my-app
```

Drops a `.mcp.json`, `CLAUDE.md`, and `README.md` pointing at the published MCP server. If you already have a project directory and just want the MCP config, skip this step and use `npx @designjs/cli init` instead (writes `.mcp.json` / `.cursor/mcp.json` / `.vscode/mcp.json` based on which IDE config dirs it detects).

### 3. Connect your agent

With the canvas running and your project scaffolded:

```bash
claude          # Claude Code — reads .mcp.json automatically
# or
cursor .
# or
code .
```

On the first tool call, the agent runs `npx -y @designjs/mcp-server` and connects. The bridge dot in the canvas Topbar flips to green. Prompt:

> "Create a Desktop artboard, then add a pricing section with three tier cards."

### Manual MCP config

If you'd rather write the MCP config yourself, add this to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "designjs": {
      "command": "npx",
      "args": ["-y", "@designjs/mcp-server"]
    }
  }
}
```

## Packages

| Package | npm name | Purpose |
|---------|----------|---------|
| [`packages/app`](./packages/app) | *(not published)* | Vite + React SPA hosting the GrapesJS canvas. Embeds a WebSocket hub (port 29170) that relays messages between the MCP server and the browser. |
| [`packages/mcp-server`](./packages/mcp-server) | `@designjs/mcp-server` | Standalone stdio MCP server. Registers all tools, forwards calls over WebSocket to the canvas. This is what `npx -y @designjs/mcp-server` runs. |
| [`packages/bridge`](./packages/bridge) | `@designjs/bridge` | Shared Zod schemas for the WS wire protocol and MCP tool I/O. Consumed by both halves. |
| [`packages/cli`](./packages/cli) | `@designjs/cli` | `designjs init` — detects the installed IDE(s) and writes the right MCP config. |
| [`packages/create-designjs`](./packages/create-designjs) | `create-designjs` | `npm create designjs@latest <dir>` scaffolder. Drops `.mcp.json` + `CLAUDE.md` into a fresh project. |

## MCP tools

Twenty bidirectional tools, grouped by area. Full input/output schemas in [`packages/bridge/src/tools.ts`](./packages/bridge/src/tools.ts).

**Inspect**
| Tool | Purpose |
|------|---------|
| `ping` | Health check — returns `{ pong: true, at: <timestamp> }`. |
| `get_tree` | Recursive JSON component tree (optional depth). |
| `get_html` | Clean HTML (optional `componentId` scope). |
| `get_css` | CSS stylesheet (optional `componentId` scope). |
| `get_jsx` | Convert canvas HTML to JSX. `mode="tailwind"` (default) preserves classNames; `mode="inline"` emits style objects. |
| `get_screenshot` | PNG/JPEG base64 screenshot (`scale=2` for high fidelity). |
| `get_selection` | Component IDs currently selected in the editor. |
| `get_variables` | Read CSS custom properties on the canvas `:root`. |

**Mutate**
| Tool | Purpose |
|------|---------|
| `add_components` | Insert raw HTML (Tailwind supported). `artboardId` lands content in a specific frame. |
| `update_styles` | Set CSS properties on a component by id. |
| `add_classes` / `remove_classes` | Tailwind class helpers without re-emitting full HTML. |
| `set_text` | Replace the text content of a text-bearing component. |
| `set_variables` | Write CSS custom properties (persisted to `.designjs.json`). |
| `delete_nodes` | Remove components and their children. |
| `select` / `deselect` | Drive the editor's selection from the agent side. |

**Artboards (multi-frame canvas)**
| Tool | Purpose |
|------|---------|
| `create_artboard` | Add a new artboard frame at given size + position. Replaces the empty scratch frame on a fresh canvas so `create_artboard({ name: "Desktop" })` yields one Desktop, not two. |
| `list_artboards` | Enumerate frames with `{ id, name, x, y, width, height }`. |
| `find_placement` | Suggest a non-overlapping `(x, y)` for a new artboard of given size. |
| `fit_artboard` | Shrink a frame's height to match content. Useful after `add_components` drops content into a fixed-preset artboard (e.g. Desktop 1440×900) and you want the artboard to hug instead of leaving blank space. |

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
| **DesignJS** | **HTML/CSS iframe (GrapesJS)** | **Open bidirectional** | **MIT** |

## Roadmap

### v0.1 — canvas + MCP foundation *(largely shipped; a few gaps remain)*

**Foundations**
- [x] Three-pane editor shell — resizable panels, layers tree, semantic inspector, all keyboard shortcuts
- [x] GrapesJS canvas with Tailwind v4 (CDN in iframe), light + dark themes
- [x] Save/load to `.designjs.json` — Cmd+S, 30s autosave, reload-restore, git-diffable
- [x] MCP server (stdio) + WebSocket bridge on `127.0.0.1:29170`, multi-peer routing
- [x] `designjs init` CLI — auto-detects Claude Code / Cursor / VS Code and writes the right MCP config
- [x] CI: typecheck, build, smoke tests (bridge round-trip, MCP stdio, init), Playwright E2E (160+ tests across 28 specs)
- [x] Repo: MIT, CONTRIBUTING, RELEASING (Changesets), ADR-driven design log

**Multi-frame spatial canvas** *(originally v0.2 — landed early)*
- [x] Infinite, pannable, zoomable canvas hosting multiple artboard frames at world coordinates
- [x] Frames as top-level layer-tree roots ([ADR-0004](./docs/adr/0004-frames-in-layer-tree.md))
- [x] Snap-to-edge frame movement, automatic placement of new artboards, resize via Breakpoint toolbar (Desktop / Tablet / Mobile / Custom)
- [x] Minimap with viewport indicator
- [x] Page-root model — first frame is "the page"; loose primitives land there ([ADR-0006](./docs/adr/0006-sizing-auto-layout-canvas-model.md))

**Primitive vocabulary** *([ADR-0005](./docs/adr/0005-html-primitives-mapping.md))*
- [x] Frame, Rectangle, Ellipse, Text, Image, Group as first-class concepts mapped to HTML/CSS storage
- [x] InsertRail for click-to-insert primitives (drag-to-canvas still pending)
- [x] Block palette — 25 ready-made HTML/Tailwind blocks across Layout / Typography / Form / Media
- [x] Per-frame counter naming (`Rectangle 1`, `Rectangle 2`, …)
- [x] Point-text behaviour for the Text primitive — sizes to content, edits cleanly under contenteditable

**Semantic inspector** *(panel reshape from sectioned style manager)*
- [x] Position — alignment, X/Y, rotation
- [x] Layout — W/H with Hug/Fill/Fixed sizing, auto-layout (flex + grid), padding, margin, clip-content checkbox
- [x] Appearance — opacity, radius (uniform + per-corner), Figma-style blend picker, cursor, z-index
- [x] Typography — family, weight, size, LH, LS, alignment, case, decoration; gated to text-bearing tags
- [x] Fill — multi-layer stack with reorder, hide, opacity, color picker
- [x] Stroke — color + width + style (solid/dashed/dotted/double)
- [x] Effects — shadow stack + filter functions (blur, brightness, contrast, saturate, grayscale, hue-rotate) + backdrop-blur
- [x] Export — JSX (Tailwind or inline mode), HTML, CSS — copy-to-clipboard
- [x] "Other CSS" Raw-CSS escape hatch — only appears when orphan properties are set
- [x] Applicability gating — controls grey out (radius on inline text) or hide entirely (auto-layout on text) when not meaningful for the selection
- [x] Lucide-only iconography, drag-to-scrub number inputs, color field with hex + alpha

**MCP tools** *(20 tools, full list above — all verified via Playwright specs)*
- [x] Inspect: `ping`, `get_tree`, `get_html`, `get_css`, `get_jsx`, `get_screenshot`, `get_selection`, `get_variables`
- [x] Mutate: `add_components`, `update_styles`, `add_classes`, `remove_classes`, `set_text`, `set_variables`, `delete_nodes`, `select`, `deselect`
- [x] Artboards: `create_artboard`, `list_artboards`, `find_placement`, `fit_artboard`

**Remaining for v0.1**
- [ ] HTML/Tailwind clipboard paste import (Epic 3 — partial: `paste-import.ts` exists for image paste)
- [x] `npm create designjs@latest` scaffolder *(shipped — `packages/create-designjs`)*
- [ ] Drag-to-canvas from the InsertRail (click-to-insert works today)
- [ ] User-extensible block config + custom Tailwind config loading
- [ ] Demo GIF, per-tool examples, troubleshooting docs (Epic 4)
- [ ] GitHub issue templates + Projects board

### v0.2 — collaboration & export polish *(weeks 5–8)*

- [ ] Figma copy-paste import (clipboard payload → primitive vocabulary)
- [ ] Selection-overlay polish + transform handles (resize/rotate by drag)
- [ ] Component instances and props (variants beyond ADR-0005's terminal primitives)
- [ ] Style sources panel — surface where each computed value comes from (component, class, instance)
- [ ] Export presets — single-file React component, multi-file with extracted CSS, plain HTML

### v0.3 — extension, multi-agent, IDE *(weeks 9–12)*

Chrome extension for site capture (DOM walk + computed-style serialization), concurrent MCP sessions with workspace isolation (foundation already in the bridge), VS Code custom editor for `.designjs.json`, shadcn/ui block library.

Detailed stories and acceptance criteria live in the PRD (not checked in).

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Releasing

Maintainer workflow for publishing releases: see [RELEASING.md](./RELEASING.md).

## License

MIT — see [LICENSE](./LICENSE).
