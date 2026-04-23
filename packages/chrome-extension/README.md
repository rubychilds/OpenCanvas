# `@designjs/chrome-extension`

DesignJS Chrome extension — capture any element from any webpage and drop it onto the DesignJS canvas as editable HTML.

Implements PRD Epic 8 (Browser extension, site capture) per [ADR-0011](../../docs/adr/0011-browser-extension-architecture.md).

> **Status:** v0.3 scaffold. Stripped from an earlier (Orbis CRM) extension; DesignJS-specific modules under `src/capture/`, `src/transport/`, `src/popup/`, `src/content/capture.ts` are scaffolded stubs with implementation TODOs.

## What it does

1. User clicks the extension icon on any page
2. Hover overlay lights up; keyboard navigates the DOM tree (↑↓←→ parent/child/sibling; Enter to capture; Esc to exit)
3. On capture, the selected subtree is serialized to HTML with inlined computed styles (hybrid inline + inherited-diff per ADR-0011 §2)
4. Extension's background worker sends the HTML over WebSocket to the running DesignJS canvas (`ws://127.0.0.1:29170/designjs-bridge`)
5. Canvas renders it into the active artboard via the existing `add_components` bridge handler

## Prerequisites

- DesignJS canvas running locally: `pnpm dev` in the DesignJS repo (starts the Vite dev server + WebSocket bridge on port 29170)
- Chrome or Chromium-based browser with Developer Mode enabled

## Dev setup

```bash
pnpm install
pnpm --filter @designjs/chrome-extension build
```

Load `packages/chrome-extension/dist/` as an unpacked extension in Chrome:
1. `chrome://extensions`
2. Enable "Developer mode" (top right)
3. "Load unpacked" → pick `packages/chrome-extension/dist`

For hot rebuild while developing:

```bash
pnpm --filter @designjs/chrome-extension dev
```

## Source layout

```
src/
├── background/
│   └── index.ts           # Service worker — owns the WS bridge connection
├── capture/
│   ├── dom-walker.ts      # Keyboard-driven element selection UI (Story 8.1)
│   └── style-serializer.ts # Computed-style serializer w/ payload watchdog (Story 8.2)
├── content/
│   └── capture.ts         # Content-script entry — wires walker + serializer
├── popup/
│   ├── index.tsx          # Minimal React popup
│   └── popup.html
├── transport/
│   └── ws-client.ts       # WebSocket peer for the DesignJS bridge (Story 8.3)
├── utils/
│   ├── chrome-promise.ts  # Promise wrappers for callback-based Chrome APIs
│   └── timeout.ts         # Generic timeout utility
└── test/
    └── setup.ts           # jsdom test setup
```

## Testing

```bash
pnpm --filter @designjs/chrome-extension test
```

Tests use Vitest + jsdom. Run `test:watch` for TDD.

## Packaging

```bash
pnpm --filter @designjs/chrome-extension package
```

Produces `designjs-extension.zip` at the package root, ready for Chrome Web Store submission.

## See also

- [ADR-0011 — Browser extension architecture](../../docs/adr/0011-browser-extension-architecture.md) (transport + style-serialization decisions)
- [ADR-0001 — WebSocket bridge on 127.0.0.1:29170](../../docs/adr/0001-frontend-ui-stack.md)
- PRD Epic 8 (Stories 8.1, 8.2, 8.3) in the product docs
