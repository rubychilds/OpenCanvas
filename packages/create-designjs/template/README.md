# __PROJECT_NAME__

A DesignJS-powered design workspace. Claude Code, Cursor, and any MCP-compatible agent can read and write a live HTML/CSS canvas from this directory.

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

## Troubleshooting

**`/mcp` doesn't list `designjs` at all.** Claude Code only reads `.mcp.json` from the directory you launch it in. Make sure you ran `claude` from inside this project directory, not its parent. If the file is present and still not detected, accept the trust prompt when Claude Code first opens the folder — until you do, project MCP servers stay disabled.

**`/mcp` shows `designjs · ◯ connecting…` and it never turns green.** The first launch downloads `@designjs/mcp-server` via `npx -y`, which can take 10–30 seconds on a slow connection. Give it a minute. If it stays stuck, try `npx -y @designjs/mcp-server </dev/null` in a terminal — you should see `mcp server ready on stdio` on stderr within a few seconds.

**`/mcp` shows `designjs · ✘ failed` or tool calls error with "bridge disconnected".** The canvas isn't running. In a separate terminal, in the DesignJS repo, run `pnpm dev` and wait for it to report both `http://localhost:3000` and the bridge on `127.0.0.1:29170` before retrying the prompt.

**The agent used a different design tool (Pencil, Paper, Figma MCP, etc.) instead of DesignJS.** Other design MCP servers configured globally in your Claude Code config (`~/.claude.json`) can compete for the same prompts. Either disable them for this project, or reinforce the instruction — [`CLAUDE.md`](./CLAUDE.md) already tells the agent to prefer DesignJS; you can strengthen it further with a one-line rule in the prompt ("Use the DesignJS MCP for this, not Pencil or Paper.").

## Learn more

- DesignJS docs: <https://github.com/rubychilds/DesignJS-docs>
- Tool reference (20 MCP tools): [`designjs-docs/mcp/`](https://github.com/rubychilds/DesignJS-docs/tree/main/mcp)
- Source: <https://github.com/rubychilds/DesignJS>
