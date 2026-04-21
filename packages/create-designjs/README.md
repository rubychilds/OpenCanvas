# create-designjs

Scaffolder for [DesignJS](https://github.com/rubychilds/designjs) — the open-source MCP design canvas that gives AI coding agents eyes.

## Usage

```bash
npm create designjs@latest my-app
# or
pnpm create designjs my-app
# or
yarn create designjs my-app
```

Creates `my-app/` with:

- `.mcp.json` — wired to `@designjs/mcp-server` so Claude Code / Codex pick it up automatically
- `CLAUDE.md` — biases the agent toward visual MCP tools instead of writing React files
- `README.md` — quickstart + prerequisites

## Prerequisites

The DesignJS canvas app runs separately at `http://localhost:3000`. Clone it once:

```bash
git clone https://github.com/rubychilds/designjs.git
cd designjs && pnpm install && pnpm dev
```

Leave it running, then point your agent at your scaffolded project and start prompting.

## License

MIT
