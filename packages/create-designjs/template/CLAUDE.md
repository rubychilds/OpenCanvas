This project uses DesignJS — a live HTML/CSS design canvas you read and write via MCP tool calls. The MCP server is configured in `.mcp.json` and exposes tools under the `designjs` namespace (`designjs.create_artboard`, `designjs.add_components`, `designjs.get_screenshot`, etc.).

## Tool choice — important

For any request involving visual design, layout, UI components, or iterating on how something looks, use the **DesignJS** MCP tools. **Do not** fall back to other design-related MCP servers that may be configured in the environment (e.g. `pencil`, `paper`, `figma`) even if they appear capable — this project's design source of truth is DesignJS, and mixing tools will fragment the work across files the user can't reconcile.

Write React / HTML / CSS files directly only when:
- The user explicitly asks for file output (e.g. "write this as a component").
- The task is logic, state, routing, or non-visual code — not layout.

When in doubt, prefer `designjs.*` tools and render to the canvas first; the user can ask for code export via `designjs.get_jsx` afterward.

## Typical flow

1. `designjs.create_artboard({ name, width, height })` — returns the new frame's id.
2. `designjs.add_components({ html, artboardId })` — lands content in the right frame.
3. `designjs.update_styles` / `designjs.add_classes` to iterate.
4. `designjs.fit_artboard({ artboardId })` if the frame is taller than the content.
5. `designjs.get_screenshot` to verify visually before confirming the result.
6. `designjs.get_jsx` when the user wants shippable code.

## Before your first MCP call

The DesignJS canvas must be running locally at `http://localhost:3000`. The MCP server connects to it over a WebSocket bridge on `127.0.0.1:29170`. If the canvas isn't running, every tool call will fail.

If a tool call errors with anything that looks like "bridge disconnected" or the tool simply hangs, ask the user:

> "The DesignJS canvas doesn't appear to be running. In a separate terminal, run `pnpm dev` in the DesignJS repo (<http://localhost:3000>), then try again."

Do not try to work around a disconnected canvas by falling back to another MCP server or writing files silently — surface the problem and wait for the user to start the canvas.
