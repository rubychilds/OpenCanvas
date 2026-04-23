# ADR-0011: Browser extension architecture — transport + style serialization

**Status:** Proposed
**Date:** April 22, 2026
**Owner:** Architecture
**Related:** [ADR-0001](./0001-frontend-ui-stack.md) (WebSocket bridge on `127.0.0.1:29170`); PRD Story 8.1 (element selection + capture), Story 8.2 (style serialization), Story 8.3 (send to DesignJS)

---

## Context

PRD Epic 8 ships a Chrome extension that lets users capture any element from any webpage and drop it onto the DesignJS canvas. The PRD's Stories 8.1 / 8.2 / 8.3 already specify acceptance criteria concretely (keyboard-navigated hover overlay, computed-style inlining, WebSocket send to port 29170). Most of the work is mechanical: Chrome extension boilerplate, DOM walker UX, popup.

There's an existing `chrome-ext/` scaffold at the repo root — a stripped-down manifest-v3 / React / Tailwind extension copied from another product. We're reusing the infrastructure (manifest, webpack, icons, test harness) and writing DesignJS-specific `capture/` + `transport/` + `popup/` modules on top.

Only **two architectural choices** are genuinely undecided after the PRD AC. This ADR pins them; everything else is implementation.

---

## Decision

### 1. Transport — direct WebSocket from extension to the bridge

The extension opens its own connection to `ws://127.0.0.1:29170/designjs-bridge`, identifies as a `browser-extension` peer on the `hello` handshake, and sends capture payloads as `{ type: "add_components", html, target?: "default" }` messages. The bridge dispatches to the canvas peer using the existing multi-peer routing it already ships for MCP-server / canvas pairs.

**Alternatives considered:**

- **HTTP POST to the MCP server.** Rejected: the MCP server is stdio-only today and adding an HTTP listener is overhead we don't need. Also requires an MCP server to be running, which isn't guaranteed for users who haven't connected an agent.
- **Content-script DOM injection.** Rejected: only works when the user has the DesignJS canvas open in another tab of the same browser; cross-window DOM messaging has sandboxing friction.

**Why WebSocket wins:**
- Bridge already ships multi-peer routing; we add a new peer type, not a new transport.
- Extension works even with no agent connected — user can capture → see it on canvas → prompt an agent later.
- Matches the architecture Paper / Pencil use for external integrations.
- One failure mode to surface: "DesignJS canvas not running" (connection refused). Maps directly to Story 8.3 AC *"If DesignJS is not running, show message: Start DesignJS first"*.

**Bridge-side change:** the bridge's peer-type enum gains `browser-extension`. The extension is read/write like the MCP server — it can send `add_components` / `add_classes` / `update_styles` / `set_text` today via the same request/response plumbing. We don't expose the full tool surface to the extension for v0.3 — only the handful needed for capture — but the transport doesn't restrict it.

### 2. Style serialization — hybrid inline / inherited-diff

When the user captures a selected subtree, the serializer walks the tree from root and emits inline styles per element using a **hybrid strategy**:

- **Non-inherited properties** (layout, dimensions, background, border, shadow, transform, opacity, z-index, flex/grid, position): always inline the full computed value on every element.
- **Inherited properties** (font-family, font-size, line-height, color, letter-spacing, text-align, cursor, direction): only inline if the computed value **differs from the parent's computed value**. Otherwise the child inherits naturally via CSS cascade, keeping the payload tight.
- **Shorthand properties**: expand (`margin: 10px 20px` → `margin-top: 10px; margin-right: 20px; margin-bottom: 10px; margin-left: 20px`) so the canvas inspector can edit individual sides.
- **CSS custom properties** (`var(--color-primary)`): resolve to the computed concrete value at capture time. The origin variable name is not preserved (the user's page can have any random variables we shouldn't leak into the canvas's token system).

**Alternatives considered:**

- **Full inline, every property on every node.** Rejected: blows the 500KB Story 8.2 payload target. A 40-node hero section × ~300 computed CSS properties × ~20 chars per property ≈ 240KB on the pessimistic side, and real payloads routinely hit 500KB+ for pages with many elements.
- **Tree-diff with generated utility classes.** Rejected for v0.3: emit a `<style>` block with hoisted classes shared across siblings with identical styling, children reference the class. Smaller payload; correct CSS cascade; but significantly harder to get right (specificity edge cases, generated class-name collisions with the target page's stylesheet). Revisit in v0.4 if payloads become a problem.

The hybrid is the Goldilocks option — easier to implement than Option B but tighter than Option A on realistic pages where typography inheritance dominates. Estimated payload reduction vs. full inline: **30–50%** on typical marketing pages, enough to sit comfortably under 500KB.

**Size budget watchdog:** the serializer tracks cumulative payload size as it walks. At 400KB it logs a warning; at 500KB it refuses to continue and returns `{ error: "Selection too large", nodeCount, byteCount }` to the popup. User sees "Too big — try capturing a smaller section."

**Custom-property scope:** inherited-diff also skips `var(--…)` references — if parent resolves `--primary` to `#ff3366` and child inherits the same value, child doesn't need any declaration.

---

## Consequences

- **Bridge gains one peer type (`browser-extension`).** Small additive change to the bridge's hello-handshake enum. No breakage to the MCP-server / canvas peer contract.
- **Extension doesn't require an agent to be running.** Cleanest "capture now, prompt later" workflow.
- **Payload target (Story 8.2 AC: <500KB) is reachable** for typical hero sections with the hybrid serializer. Extreme cases (full-page captures) hit the watchdog and fail cleanly.
- **Custom-property resolution strips token provenance.** A user's page using `var(--color-primary: #ff3366)` shows up on canvas as `#ff3366`, not as a DesignJS token. This is the right default — we can't assume the user's design-system names map to DesignJS's. A stretch feature (v0.4+) could *prompt* the agent to convert hard-coded colors into DesignJS tokens after capture.
- **Extension tool surface is capped to what the canvas needs.** Even though the bridge doesn't restrict it, the extension only sends `add_components` in v0.3 (and optionally `set_text` for text selection tweaks). No `delete_nodes` or other write tools from the extension — keeps the blast radius small.
- **Scaffold delta.** Existing `chrome-ext/` scaffold strips ~95% of `src/` (Orbis-specific) and retains manifest-v3 skeleton + webpack config + icons + chrome-promise utility + test harness. New code: `src/capture/dom-walker.ts`, `src/capture/style-serializer.ts`, `src/transport/ws-client.ts`, minimal popup. Rehoming to `packages/chrome-extension/` so it participates in the pnpm workspace + CI.

---

## Open questions

1. **Capture scope — subtree or just the selected element?** Story 8.1 AC says "captures the selected element and its entire subtree" — that's the decision. But "subtree" can mean "DOM descendants" or "visual descendants" (some off-screen / `display:none` children skipped). v0.3 ships "DOM descendants, skip `display:none`." Users who want everything can capture the parent explicitly.

2. **`<img>` handling.** Image URLs on the captured page are cross-origin. Options: (a) leave the `src` as-is — fails to load on canvas unless the origin allows it; (b) fetch + base64-encode at capture time — bloats payload; (c) upload to the `.designjs.json`'s `assets` array via data-url. Leaning (a) for v0.3 with a "broken image" placeholder and a docs note; (c) for v0.4.

3. **SVG inline vs. external.** Inline `<svg>` captures cleanly. `<img src="*.svg">` or `background-image: url(*.svg)` hit the cross-origin problem above. Same resolution as images.

4. **Shadow DOM.** Many modern sites use web components with shadow DOM. The capture walker has to choose: pierce shadow roots (heavier, more complete) or skip them (lighter, may miss critical styling). Leaning skip for v0.3; log a warning to the popup.

5. **Position scoping on capture.** If the captured element uses `position: absolute` relative to an ancestor that's not captured, the positioning loses its anchor on the canvas. Safest: convert captured-root's `position: absolute` to `position: relative` or drop positioning entirely. Needs an ADR-level call once we've seen real captures — flagged for the implementation spike.

6. **Chrome Web Store review timeline.** Review is 1-2 weeks elapsed. Factor into v0.3 delivery gate — the marketplace listing happens AFTER the extension is feature-complete to avoid a bad first impression, not in parallel with development.

---

## References

- PRD Story 8.1 / 8.2 / 8.3 (all AC items)
- [ADR-0001](./0001-frontend-ui-stack.md) — WebSocket bridge + multi-peer routing foundation
- Existing scaffold: `chrome-ext/` (pre-strip) → `packages/chrome-extension/` (post-strip, post-rehome)
- Anima / Locofy / Penpot-exporter Figma plugins (Plugin API pattern; this is the *web* equivalent via Chrome extension)
