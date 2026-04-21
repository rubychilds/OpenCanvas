This project is wired to the OpenCanvas MCP server — a live HTML/CSS design canvas you can read from and write to via MCP tool calls.

For any request involving visually designing, previewing, or iterating on UI, prefer the OpenCanvas MCP tools (`add_components`, `update_styles`, `get_screenshot`, `get_jsx`, `create_artboard`, `fit_artboard`, etc.) over writing React files. Write files only when the user explicitly asks for them, or when the task is logic/state/routing rather than visual layout.

Typical flow:

1. `create_artboard({ name, width, height })` — returns the new frame's id
2. `add_components({ html, artboardId })` — lands content in the right frame
3. `update_styles` / `add_classes` to iterate
4. `fit_artboard({ artboardId })` if the frame is taller than the content
5. `get_jsx` when the user wants to ship

Before your first MCP call, make sure the OpenCanvas canvas is running locally (the user should have it at `http://localhost:3000` via `pnpm dev` in the OpenCanvas repo — if they don't, ask them to start it).
