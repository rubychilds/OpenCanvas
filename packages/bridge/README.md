# @designjs/bridge

Shared [Zod](https://zod.dev/) schemas and protocol constants for [OpenCanvas](https://github.com/rubychilds/opencanvas) — the open-source MCP design canvas.

This package is consumed by both halves of OpenCanvas:

- `@designjs/mcp-server` (the stdio MCP binary agents spawn)
- The OpenCanvas canvas runtime (browser-side WebSocket bridge client)

You typically don't install this directly. It's a dependency of `@designjs/mcp-server`, which is what you register with Claude Code / Cursor / VS Code.

## What's in it

- **Tool schemas** — input/output Zod schemas for every MCP tool (`get_tree`, `add_components`, `update_styles`, `create_artboard`, etc.).
- **Protocol constants** — WebSocket host/port/path + message envelope types.
- **Tool descriptions** — the strings that ship to agents so they know when to call each tool.

Both halves of OpenCanvas import from here; when the two need to agree on a wire shape, it's defined here once.

## License

MIT
