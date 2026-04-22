# Changelog

All notable changes to DesignJS across its published packages (`@designjs/bridge`, `@designjs/mcp-server`, `create-designjs`) are documented here. For changes to the canvas app (`@designjs/app`) or the CLI (`@designjs/cli`), which are not published to npm in v0.1, see the commit log on [GitHub](https://github.com/rubychilds/DesignJS).

The format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); SemVer applies per-package (though all three share a version across v0.1).

## [0.1.0] — 2026-04-22

First stable release of the v0.1 alpha cycle. Functionally identical to `0.1.0-alpha.1` — same published bits — but promoted to `latest` on npm with no known critical bugs open.

### What you get
- `npm create designjs@latest <dir>` scaffolds a project wired to the DesignJS MCP server.
- `@designjs/mcp-server` exposes **20+ MCP tools** to any stdio-compatible agent (Claude Code, Cursor, VS Code Copilot / Continue, Codex, Windsurf) across five categories: inspect, component mutation, artboards, variables, selection.
- The canvas app runs locally from the [DesignJS repo](https://github.com/rubychilds/DesignJS) via `pnpm dev` — Vite + React + GrapesJS with Tailwind v4 in the iframe. Multi-artboard spatial layout with pan/zoom/minimap and a semantic inspector with the full Penpot-style ten-section catalogue (Layer · Measures · Auto Layout · Layout Item · Fill stack · Stroke · Shadow · Typography · Exports · Effects).
- Saves to `.designjs.json` — git-diffable JSON at the project root.

### Known limitations
- The canvas writes to a single `.designjs.json` at the Vite dev server's project root — today that's the DesignJS repo clone. Per-project design file discovery (per-project `.designjs.json`, file switcher UI, `get_project_context` bridge handshake) is planned for v0.2. For now, run one canvas session per project directory.
- `@designjs/cli` (`designjs init` auto-detect) stays unpublished in v0.1. Existing projects should write `.mcp.json` by hand; new projects use `create-designjs`.
- Changesets is not installed — releases are cut manually per [RELEASING.md](./RELEASING.md). Revisit around v0.2.

## [0.1.0-alpha.1] — 2026-04-21

Second alpha. Published to unblock CI + fix the four multi-frame regressions that surfaced while verifying the `0.1.0-alpha.0` artifacts end-to-end.

### Fixed — multi-frame regressions (caught during the alpha.1 dogfood push)
- **Variables never reached the iframe `:root`.** `editor.Canvas.getDocument()` returns `undefined` under GrapesJS v2's multi-frame layout, so `applyAll` silently wrote to nothing — the UI list updated, but `--brand-primary` (and everything else) never landed on the canvas. Fixed by iterating `editor.Canvas.getFrames()` and writing each frame's `view.getWindow().document.documentElement`. Covered by Story 6.2 UI + MCP specs.
- **`editor.addComponents(html)` created detached components with no iframe mount.** `addHtml` (e2e helper + dev-tool) and the bridge `add_components` default branch now append into the first frame's wrapper, matching the pattern the `artboardId` branch already used. Fixes Story 7.1 selection overlay (selected components had no `el` to measure) and un-scoped `get_screenshot` (toPng hung against an empty wrapper-iframe body).
- **`component.getEl()` returns null under v2 multi-frame.** `component.view.el` holds the primary-view element instead. `SelectionOverlay.readRect` and `component-style.readComputedStyle` now try `view.el` first and fall back to `getEl()` for resilience.
- **`editor.Canvas.getFrameEl()` returns a wrapper iframe with an empty body under multi-frame.** `get_screenshot` un-scoped branch now prefers `frameIframe(getFrames()[0])` and only falls back to `getFrameEl` if no real frames exist.

### Fixed — other
- **Topbar clicks silently swallowed.** The full-width artboard title buttons introduced in `d190a33` (`pointer-events-auto` + drag grab area) overlaid the Topbar when a frame sat near the top of the canvas viewport — the Variables popover trigger was unreachable. `ArtboardTitleBars` now uses `clip-path: inset(var(--topbar-height) 0 0 0)` on its fixed overlay.
- **CI typecheck failed on the rebrand commit** because `.github/workflows/ci.yml` still referenced `@opencanvas/bridge` (pre-rebrand). Updated the workflow to `@designjs/bridge`.
- **Three E2E tests predated commit `51ce020`'s scratch-frame cleanup** (replace the empty default "Frame 1" when the first named artboard appears) and still asserted `before + 1` frame count after `create_artboard`. Updated the tests — `story-5.3` asserts presence-by-id, `story-5.2-minimap` clicks `oc-insert-frame` twice so the second create builds on a non-scratch state, `story-mcp-add-components-artboard` pre-seeds the default frame with content so it survives.

### Added
- **LICENSE** file in `packages/bridge` and `packages/mcp-server` so it ships in the tarballs (previously only `create-designjs` had its own).
- **Troubleshooting accordions** in `designjs-docs/connect-agent.mdx` + `integrations/claude-code.mdx` covering the real failure modes: wrong cwd, trust-dialog not accepted, `connecting…` cold-install lag, bridge disconnected, competing design MCPs, stale `opencanvas` entries from the pre-rebrand era.
- **Explicit multi-MCP guidance** in the scaffolded `CLAUDE.md` template telling agents to prefer DesignJS over competing design MCPs (Pencil, Paper, Figma) that may be configured globally.

### Changed
- Rebranded CI yaml + issue templates + scaffolder templates from `@opencanvas/*` to `@designjs/*` (follow-up to the repo rename landed in `79f3f7e`).
- Root `pnpm typecheck` script now builds `@designjs/bridge` first so downstream packages can resolve the import.
- `@designjs/mcp-server`'s published tarball now correctly declares `"@designjs/bridge": "<current version>"` in its `package.json` (previously `workspace:*` unless caught by `pnpm publish`).

## [0.1.0-alpha.0] — 2026-04-21

First alpha published to npm. Seeded the `@designjs` scope and the `create-designjs` package name.

### Added
- `@designjs/bridge@0.1.0-alpha.0` — shared Zod schemas and protocol constants for the DesignJS MCP server and canvas runtime.
- `@designjs/mcp-server@0.1.0-alpha.0` — stdio MCP server binary (`designjs-mcp`).
- `create-designjs@0.1.0-alpha.0` — project scaffolder (`npm create designjs@latest <dir>`) dropping `.mcp.json` + `CLAUDE.md` + `README.md`.

### Known issues
- Multi-frame regressions in Variables propagation, `add_components` default routing, `SelectionOverlay.readRect`, and un-scoped `get_screenshot` — **fixed in `0.1.0-alpha.1`**, users on alpha.0 should upgrade.
- Tarballs missed `LICENSE` for `@designjs/bridge` and `@designjs/mcp-server` — **fixed in `0.1.0-alpha.1`**.

[0.1.0]: https://github.com/rubychilds/DesignJS/releases/tag/v0.1.0
[0.1.0-alpha.1]: https://github.com/rubychilds/DesignJS/releases/tag/v0.1.0-alpha.1
[0.1.0-alpha.0]: https://github.com/rubychilds/DesignJS/releases/tag/v0.1.0-alpha.0
