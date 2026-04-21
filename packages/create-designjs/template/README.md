# __PROJECT_NAME__

An DesignJS-powered design workspace. Claude Code, Cursor, and any MCP-compatible agent can read and write a live HTML/CSS canvas from this directory.

## Prerequisites

The DesignJS canvas app must be running locally. If you haven't set it up yet:

```bash
git clone https://github.com/rubychilds/DesignJS.git
cd DesignJS
pnpm install
pnpm dev
```

The canvas opens at <http://localhost:3000>. Leave it running in its own terminal.

## Start designing

From this directory, open your agent of choice:

```bash
claude        # Claude Code reads .mcp.json automatically
# or
cursor .
# or
code .
```

On first tool call, your agent will run `npx -y @designjs/mcp-server` (configured in `.mcp.json`) and connect to the canvas over its local WebSocket bridge. The bridge-connected indicator in the canvas Topbar will flip to green.

Then try a prompt like:

> Create a Desktop artboard, then add a two-column pricing section with three tier cards.

## Files

- [`.mcp.json`](./.mcp.json) — MCP server config (Claude Code / Codex convention). Cursor reads `.cursor/mcp.json`; VS Code reads `.vscode/mcp.json`. Use `npx @designjs/cli init` to generate any of these.
- [`CLAUDE.md`](./CLAUDE.md) — agent guidance: biases the agent toward the DesignJS MCP tools for visual work instead of writing files.

## Learn more

- DesignJS docs: <https://github.com/rubychilds/DesignJS-docs>
- Tool reference (20 MCP tools): [`designjs-docs/mcp/`](https://github.com/rubychilds/DesignJS-docs/tree/main/mcp)
- Source: <https://github.com/rubychilds/DesignJS>
