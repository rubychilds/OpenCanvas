# @opencanvas/mcp-server

The stdio [Model Context Protocol](https://modelcontextprotocol.io/) server for [OpenCanvas](https://github.com/rubychilds/opencanvas) — an open-source MCP design canvas that gives AI coding agents eyes on a live HTML/CSS canvas.

Register this server with Claude Code, Cursor, or any MCP-compatible client and the agent can:

- Read the canvas — component tree, HTML, CSS, screenshots, current selection
- Write to the canvas — insert components, update styles, delete nodes, add Tailwind classes, set text
- Manage artboards — create, list, resize, fit-to-content, find non-overlapping placements
- Export — get JSX (Tailwind or inline-style mode), persist design tokens

## Quickstart

```bash
# 1. Start the canvas locally (needs the OpenCanvas app running)
git clone https://github.com/rubychilds/opencanvas.git
cd opencanvas && pnpm install && pnpm dev

# 2. Register the MCP server in your project
cd ~/your-project
npx @opencanvas/cli init         # writes .mcp.json / .cursor/mcp.json / .vscode/mcp.json

# 3. Open your agent and start prompting
#    "Create a Desktop artboard, add a pricing section with 3 tier cards"
```

The `init` command writes a config pointing at `npx -y @opencanvas/mcp-server`. If you'd rather configure manually, add this to your `.mcp.json`:

```json
{
  "mcpServers": {
    "opencanvas": {
      "command": "npx",
      "args": ["-y", "@opencanvas/mcp-server"]
    }
  }
}
```

## Tool reference

Full per-tool docs with input/output schemas and example prompts live at [opencanvas.dev/mcp](https://github.com/rubychilds/opencanvas-docs). Twenty tools across five categories:

- **Read:** `get_tree` · `get_html` · `get_css` · `get_screenshot` · `get_selection` · `list_artboards` · `get_variables` · `ping`
- **Write (components):** `add_components` · `update_styles` · `add_classes` · `remove_classes` · `set_text` · `delete_nodes`
- **Write (artboards):** `create_artboard` · `find_placement` · `fit_artboard`
- **Selection:** `select` · `deselect`
- **Tokens + export:** `set_variables` · `get_jsx`

## How it connects

```
┌───────────┐    stdio     ┌───────────────────┐    WebSocket    ┌──────────────┐
│ Agent     │──(JSON-RPC)─▶│ @opencanvas/       │◄──(bridge)─────▶│ OpenCanvas   │
│ (Claude,  │              │ mcp-server         │   127.0.0.1:    │ canvas app   │
│  Cursor)  │              │ (this package)     │    29170        │ (pnpm dev)   │
└───────────┘              └───────────────────┘                 └──────────────┘
```

The MCP server is a thin translator: MCP requests in, bridge WebSocket messages out, canvas acknowledgements back, MCP responses out. Schemas are shared with `@opencanvas/bridge`.

## License

MIT
