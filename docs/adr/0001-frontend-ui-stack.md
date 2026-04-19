# ADR-0001: Frontend UI stack for the OpenCanvas editor shell

**Status:** Accepted
**Date:** April 18, 2026
**Owner:** Architecture
**Related:** PRD §5.1 (Architecture), PRD §7.1 Story 1.3 (Editor shell), PRD §8.3 Epic 7 (Editor polish)

---

## Context

OpenCanvas is a design tool. The canvas itself is the user's design — real HTML/CSS rendered inside a GrapesJS iframe. Everything *around* the canvas (the "chrome": layer tree, block palette, style panel, toolbars, inspector, command palette, modals, toasts) is the editor UI that frames and controls the canvas.

PRD Story 1.3 commits to a layers / canvas / style three-pane editor shell in week 1 of v0.1. Without a decided UI component stack, that story cannot start without the risk of expensive rework when polish lands in v0.2 (Epic 7). We also need a stack answer to credibly match the visual quality bar set by Pencil and Paper, which is a stated competitive concern in PRD §4.3.

This ADR commits to a specific set of libraries so editor UI work can begin immediately and converge on the intended aesthetic by public alpha (v0.2, week 8).

### Forces

- **Aesthetic target:** the chrome should read as a design tool, not a SaaS dashboard. Reference points: Pencil, Figma, Linear, Paper. This means high information density, restrained neutral palette, dark-theme parity, tight type scale, muted borders, and specialized controls (numeric steppers, color pickers, popover-based inspectors) that general-purpose React libraries do not ship.
- **Design-tool primitives do not exist in any single library.** No off-the-shelf React kit covers layer trees, resizable panels, color pickers, floating property popovers, and command palettes together. Some assembly is unavoidable.
- **Canvas ≠ chrome.** GrapesJS handles the canvas (selection, drag, style editing, iframe rendering). This ADR is about the React SPA that surrounds it.
- **MIT-compatible licensing.** OpenCanvas is MIT. Any dependency with copyleft licensing (AGPL, MPL for chrome libraries) is out.
- **Control over primitives, not just components.** Editor UIs routinely need density adjustments (12–13px UI, tight paddings, custom hit targets) that heavily-themed libraries fight against.
- **Existing audience familiarity.** Dana (the PRD's primary persona) ships with Next.js + shadcn/ui + Tailwind. Choosing the same stack means contributors can read our code without ramping on a new system.

### Constraints inherited from the PRD

- React SPA on Vite (§5.1)
- Local-first, no cloud dependencies (§5.2)
- Ship v0.1 in 4 weeks, v0.2 in 8, v0.3 in 12
- Must not bloat the installed footprint for `npm create opencanvas@latest`

---

## Decision

OpenCanvas will use the following frontend stack for the editor shell:

### Core

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Styling** | Tailwind CSS v4 | Already the canvas styling system (PRD 1.2). Keeping the chrome on the same engine avoids two CSS pipelines. v4 only — deferring v3 support to the canvas iframe, not the chrome. |
| **Component library** | shadcn/ui | Code-owned (copied into the repo, not imported as a package), so density and styling can be tuned to design-tool norms without forking a dependency. Built on Radix, which gives us accessibility and keyboard handling for free. Dana's existing mental model. |
| **Primitives** | Radix UI | Used indirectly via shadcn/ui for Dialog, Popover, DropdownMenu, Tooltip, ContextMenu, Tabs, ToggleGroup. Headless + accessible; we own all styling. |
| **Icons** | Lucide React | Neutral geometric style matches Pencil and Figma. Consistent with shadcn defaults. Tree-shakeable. |
| **Typography** | Inter for UI, JetBrains Mono for code/numeric fields | Standard editor-tool pairing. Deliberately boring — the canvas is the star. Loaded via the `fontsource` packages, no CDN dependency. |

### Specialized design-tool pieces

These do not exist in shadcn/ui and must be added:

| Need | Choice | Why this over alternatives |
|------|--------|---------------------------|
| Layer tree panel (virtualized, drag-reorder, nested) | `react-arborist` | Purpose-built for this. Handles virtualization, keyboard nav, drag-drop. Alternative considered: rolling our own tree — estimated 2 weeks to get right, not on critical path. |
| Resizable three-pane layout | `react-resizable-panels` | Small, well-maintained, persists sizes. Alternative: `allotment` (VS Code origin, heavier, more opinionated). |
| Floating panels, popovers, context menus positioning | `@floating-ui/react` | Already a Radix dependency. Use directly for non-Radix floating elements (canvas-anchored toolbars, inline property pickers). |
| Color picker | `react-colorful` | 2.8 KB, unopinionated, pairs cleanly with shadcn. Alternative: `react-color` (larger, less maintained). |
| Command palette (⌘K) | `cmdk` | Same author as shadcn's `<Command>` component — integrated naturally. Table stakes for design tools in 2026. |
| Keyboard shortcuts | `react-hotkeys-hook` | Declarative, scoped, plays nicely with Radix focus management. |
| Numeric steppers (px/rem/%) | Custom wrapper on shadcn `<Input>` | None of the libraries ship the specific increment-on-drag, modifier-key-scaling behavior Figma and Pencil use. This is ~200 lines and differentiates the tool's feel. Commit to building it in Story 1.6. |
| Toast notifications | `sonner` | Already part of the shadcn family. |

### Explicitly rejected

| Option | Reason |
|--------|--------|
| **Mantine** | Denser than MUI but still themed around application UI, not tool UI. Would mean two styling engines alongside Tailwind (Mantine has its own). |
| **Blueprint (Palantir)** | Functionally closest to what we want but visually dated, Sass-based, hard to match the modern flat aesthetic of Pencil without heavy overrides. |
| **MUI / Chakra / Ant Design** | All assume content/app UI density. Fighting them on spacing and type scale wastes more time than composing from primitives. |
| **Headless UI (Tailwind Labs)** | Narrower primitive set than Radix. Radix is the modern default and shadcn is built on it. |
| **Building entirely on Radix without shadcn** | Doable but deletes ~40 hours of sensible default styling. shadcn is copied into our repo, so we retain full ownership. |
| **Web Components / native elements only** | Would sacrifice the React ecosystem (react-arborist, cmdk, sonner) that makes this tractable in 12 weeks. |

### Theming

- Two themes, both ship in v0.2: **light** (default, matches Pencil) and **dark** (matches Figma Dark / Linear).
- Theme defined as CSS custom properties on `:root` and `[data-theme="dark"]` in the shadcn convention.
- Theme is a separate concern from the design tokens in PRD Story 6.2. Those are user-facing tokens for canvas content; this ADR governs only the editor chrome tokens.
- Follow-up work: a small `tokens.css` file in `packages/app/src/styles/` that establishes the density scale (`--size-1` … `--size-8`), a UI type scale capped at 13px for body and 11px for micro-copy, and a restrained neutral palette (~5 grays, one accent).

---

## Consequences

### Positive

- **Story 1.3 unblocks immediately.** The PRD week-1 editor shell can be built directly from shadcn's `ResizablePanelGroup`, `Sidebar`, and `ScrollArea` primitives.
- **Epic 7 (Editor polish) becomes a styling pass, not a rewrite.** Selection overlays, smart guides, and responsive preview can be layered onto an already-correct component system.
- **Contributor onramp is short.** "It's shadcn + Tailwind" is a one-line answer that lets prospective OSS contributors orient in minutes.
- **Dark theme for free from shadcn.** Critical for matching Figma/Linear visually and credible positioning against Pencil.
- **Aesthetic ceiling is high.** Pencil itself appears to use this exact stack per inspection of its UI.

### Negative

- **Aesthetic ceiling is also a floor — shadcn has a recognizable look.** If OpenCanvas is not carefully tuned (density, type scale, icon weight, spacing), it will look like "another shadcn app" rather than a professional design tool. Mitigation: the tokens.css density pass is not optional; it ships with Story 1.3.
- **~8 additional dependencies** (`react-arborist`, `react-resizable-panels`, `react-colorful`, `cmdk`, `sonner`, `react-hotkeys-hook`, `@floating-ui/react`, `lucide-react`). All small, all MIT, but the scaffold footprint grows. Acceptable given what they replace (each would otherwise be weeks of custom code).
- **Custom numeric stepper is net-new code.** No off-the-shelf component matches design-tool behavior. Budget ~1 day in Story 1.6 to build it properly the first time.
- **Tailwind v4-only is a commitment.** If the Tailwind team shifts direction or the migration pain of v4 proves larger than expected in the ecosystem, we revisit.

### Risks and mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Shadcn ends up feeling too generic ("SaaS dashboard") despite tuning | Medium | Reference-driven design review at end of v0.1 week 4 against Pencil/Figma/Linear screenshots. If the gap is large, allocate a design-focused sprint early in v0.2. |
| react-arborist doesn't scale to 500+ nested components | Medium | Benchmark when arborist is installed (Phase D). Already virtualized; if it breaks, fall back to `@headless-tree/react`. |
| Dark theme doubles QA surface | Low | Keep light as default; dark ships in v0.2 polish epic, not v0.1. |
| Custom numeric stepper bug-prone | Low | Extract as a dedicated component with unit tests in Story 1.6. Model behavior explicitly on Figma's (click-drag, Shift = ×10, Alt = ÷10). |

---

## Implementation notes (non-normative)

Directory layout in `packages/app/src` (actual, post-Phase A):

```
components/
  ui/              # shadcn components, copied in
  editor/          # (planned) opencanvas-specific composites
                   #   LayerTree, BlockPalette, StylePanel, ArtboardToolbar,
                   #   ColorField, CommandPalette. Currently these live at the
                   #   top of components/ directly; refactor into editor/ as
                   #   they grow.
  canvas/          # GrapesJS React wrapper and canvas-adjacent UI (CanvasArea)
styles/
  tokens.css       # density, type, color tokens for the chrome
  globals.css      # Tailwind directives + @theme inline mapping
hooks/
  useTheme.ts
  # useHotkeys.ts — planned, lands with react-hotkeys-hook in Phase D
lib/
  utils.ts         # cn (clsx + tailwind-merge)
```

Icon conventions: 16px default in the chrome, 14px in dense controls (block palette items, layer tree rows). Stroke weight 1.5 (Lucide default). No filled icons unless indicating state.

Type scale (formalized in tokens.css):
- `--text-xs`: 11px (micro-copy, keyboard shortcut hints)
- `--text-sm`: 12px (panel labels, tree items)
- `--text-base`: 13px (body, input text)
- `--text-lg`: 14px (section headers within panels)

Everything above 14px is reserved for toasts, modals, and onboarding — the editor chrome itself should never use it.

---

## Open questions (deferred)

These do not need to be resolved to accept this ADR but will come up during Epic 7:

- Do we expose the theme token system to users for custom editor themes? (Probably post-v1.0.)
- Does the command palette use MCP tool invocation as its backend? (Interesting — would make agent tools and keyboard shortcuts share a registry. Revisit in v0.3.)
- How much of shadcn do we keep pristine vs. fork heavily? (Aim: keep primitives pristine, build editor-specific composites in `components/editor/`.)

---

## Addendum — 2026-04-18: Phase A implementation status + deferred pieces

Phase A (commits `d2f0870`, `b56957a`, `3f0bda7`) implemented the **core** and the two specialized pieces needed to unblock the panel migration:

| ADR commitment | Phase A status |
|----------------|----------------|
| Tailwind v4 via `@tailwindcss/vite` | ✅ Installed, `@theme inline` in `globals.css` |
| `tokens.css` with light (default) + dark themes | ✅ |
| shadcn primitives: `Button`, `Tabs`, `Tooltip`, `ScrollArea`, `Separator` | ✅ Copied into `components/ui/` |
| Radix primitives (via shadcn) | ✅ `@radix-ui/react-{scroll-area,slot,tabs,tooltip}` installed |
| `lucide-react` icons | ✅ |
| `@fontsource-variable/inter` + `jetbrains-mono` | ✅ |
| `react-resizable-panels` | ✅ (was already present; now Tailwind-styled) |
| Custom `NumberInput` (drag, Shift=×10, Alt=÷10, unit-preserving) | ✅ Built as `components/ui/number-input.tsx` |
| Type scale capped at 14px | ✅ Enforced through `@theme inline --text-*` |
| `useTheme` + localStorage | ✅ |

The remaining specialized pieces from the decision table are **deliberately deferred** rather than installed unused. Each lands in the phase whose scope first needs it:

| Package | Deferred to | Justification |
|---------|-------------|---------------|
| `react-arborist` | **Phase D** (Epic 7, Story 7.1) | Current naive recursive `LayersPanel` passes tests and handles the v0.1 canvas sizes (< 50 components). The Risk table's benchmark commitment triggers *when* arborist is installed — honored by tying it to Epic 7's selection-overlay work. |
| `react-colorful` | **Phase C** (Epic 6, Story 6.2 design tokens) | First user-facing surface that edits colors. No v0.1 UI exposes color properties today. |
| `sonner` | **Phase B** (Epic 5) | Multi-artboard creation introduces async failures (`create_artboard`, save errors on a busy canvas) that want toast affordances. Currently inline topbar text is adequate for the single-surface v0.1 save. |
| `cmdk` | **Small inter-phase commit between B and C** | No PRD story mandates a command palette; ADR commits to it as table stakes. Natural to slot it next to the "MCP tool registry as command source" open question as v0.3 approaches. |
| `@floating-ui/react` | **On demand in Phase D** | Radix primitives cover every currently-needed floating surface. Pull in directly only when canvas-anchored toolbars land in the selection-overlay work. |
| `react-hotkeys-hook` | **Mid-Phase D** | Raw `window.addEventListener('keydown')` handles the three current shortcuts (⌘S save, ⌘D duplicate, ⌘/⌃ undo/redo through GrapesJS). Migrate when Epic 7 adds enough shortcuts to warrant a declarative registry. |

Nothing originally accepted has been rejected. Nothing new has been added. The deferral is cost-based (don't install unused code) and risk-based (benchmark commitments only make sense when the library is actually in use).

**Status transition:** Proposed → **Accepted** as of this addendum. The Decision table is load-bearing for new work; any deviation requires a follow-up ADR.

---

## Addendum — 2026-04-18 (late): Phase D reality + icon-stack amendment

Phase D (D.3 through D.6) surfaced two facts that amend this ADR's Decision table. Both are recorded here rather than in a new ADR because neither is load-bearing enough to require a separate accept cycle, but both contradict the plain reading of the original decisions.

### 1. Icon library: Phosphor filled + Lucide fallback (not Lucide alone)

The Decision table commits to **Lucide React** with "stroke weight 1.5, no filled icons unless indicating state." In practice, a design review during Phase D confirmed that Lucide's outline-only style reads as "SaaS dashboard" (the exact risk the ADR flagged). Per user direction in commit `b6e6fa5` (D.4d.2), the editor swapped to **Phosphor Icons** with `weight="fill"` applied globally via `IconContext.Provider` at the App root.

Subsequent review of the flex-layout icons (`AlignHorizontalSpaceBetween`, `AlignHorizontalSpaceAround`, `StretchHorizontal`) found that Phosphor ships no clean analog for these — the substitutions routed through `TextAlignJustify` / `TextAlignCenter` / `ArrowsHorizontal` read as semantic mismatches. Commit `7a9f808` re-introduced `lucide-react` as a secondary source for exactly those three icons, giving a mixed-stack system.

**Final icon strategy:**
- **Single point of import:** `packages/app/src/canvas/chrome-icons.ts`. Call sites throughout the app import Lucide-style names from this wrapper and never touch either library directly.
- **Primary source:** `@phosphor-icons/react` 2.1.10 with `weight="fill"` applied via IconContext.Provider at the App root.
- **Fallback source:** `lucide-react` 1.8.0 for the three flex-distribution icons that Phosphor has no analog for. Outline-only; acceptable because they are structural markers, not ornamental glyphs.
- **Icon naming:** always Lucide-style (`AlignLeft`, `ChevronDown`, `StretchHorizontal`, etc.) regardless of source library. The wrapper does the translation.

This mixed approach keeps the wrapper the only seam in the codebase — call sites remain library-agnostic, and swapping the primary source again in the future (Heroicons, custom SVG sprite, etc.) is a one-file change.

### 2. Control catalogue: deferred pieces shipped earlier than planned

The addendum above deferred `react-colorful` to Phase C (Epic 6 design tokens UI). It actually shipped in **Phase D.5** (`61e6c1c` / `09fc6cf` / `80ca8fa`) as part of the shared `<ColorField>` control used by FillSection / StrokeSection / ShadowSection. Reason: the Penpot-shape reframing in [ADR-0003](./0003-panel-information-architecture.md) made multi-layer fills a first-class concern, and those need a picker.

The other deferrals (`react-arborist`, `sonner`, `cmdk`, `@floating-ui/react`, `react-hotkeys-hook`) remain deferred on the original schedule. `react-arborist` is still not present — the naive recursive `LayersPanel` continues to handle v0.2 canvas sizes. The Risk table's benchmark commitment remains valid and triggers when arborist is installed.

### 3. Additional dependencies landing in Phase D (not in the original table)

| Package | Landed in | Justification |
|---------|-----------|---------------|
| `@phosphor-icons/react` | D.4d.2 | Filled iconography per design review. |
| `@radix-ui/react-accordion` | D.3d | Raw CSS fallback accordion + Story 7.3 readability. |
| `@radix-ui/react-toggle-group` | D.4 | Icon ToggleGroups for alignment rows per Story 7.0 AC. |
| `@radix-ui/react-dropdown-menu` | D.3 era | Topbar overflow menu. |
| `@radix-ui/react-popover` | D.5 | ColorField picker surface. |

All are Radix primitives or Phosphor's own package — consistent with the ADR's "prefer Radix for everything headless" direction.

**Status transition:** This addendum keeps the ADR at **Accepted**. Nothing originally accepted is rejected; the decision table's "Icons: Lucide React" row is amended to the mixed-stack strategy above. If the primary-source question reopens (e.g., custom SVG sprite like Penpot uses), that warrants a new ADR.

---

*End of ADR-0001.*
