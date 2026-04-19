# ADR-0003: Panel information architecture — Penpot as the reference shape

**Status:** Accepted
**Date:** April 18, 2026
**Owner:** Architecture
**Supersedes:** nothing (complements [ADR-0001](./0001-frontend-ui-stack.md) and [ADR-0002](./0002-inspector-information-architecture.md))
**Related:** PRD §7.1 Story 1.3 (Editor shell), §8.3 Epic 7 / Story 7.0 (Chrome density), PRD Progress summary

---

## Context

[ADR-0001](./0001-frontend-ui-stack.md) chose the stack (shadcn + Tailwind + Radix + Lucide). [ADR-0002](./0002-inspector-information-architecture.md) committed to a semantic inspector on the right. Neither ADR pinned the **information architecture** of the two side panels: how many tabs, which sections appear, what each row looks like. Phase D.3a–d shipped a working shell (InsertRail, floating zoom widget, semantic inspector with Position / Auto Layout / Frame / Raw CSS) but users kept flagging that the shape still felt "SaaS dashboardy" rather than "design tool" — the risk ADR-0001 explicitly called out.

To close that gap we surveyed [Penpot](https://penpot.app/) (MPL-2.0, ClojureScript, cloned locally at `./penpot/` and gitignored) as a reference implementation. Penpot's MIT-incompatible licence means we cannot copy its code, but we can copy its **shape**.

This ADR records the structural deltas we found and the decisions that follow.

---

## Context: survey findings

### Penpot left sidebar

Source: `penpot/frontend/src/app/main/ui/workspace/sidebar.cljs` and neighbours (`layer_item.cljs`, `layers.cljs`, `sitemap.cljs`, `assets.cljs`).

- **Three top-level tabs:** Layers · Assets · (Tokens, behind a feature flag).
- **Layer tree:** 32px rows. Each row = icon + name + visibility-eye + lock/block toggle. Hover → `--color-background-secondary`. Selected → `--color-background-quaternary`. Drag-to-reorder with three visual states (over-top, over-self, over-bot). Double-click rename, commit on blur/Enter.
- **Pages vs frames:** explicit two-level model. A collapsible **Sitemap** section sits above the layer tree with per-page rows (rename, delete, drag-to-reorder). Frames ("boards") are nodes inside a page's layer tree, not a separate tab.
- **Assets:** colors, components, typographies, library files — all searchable, filterable, separable by local vs library.
- **Search:** filter bar in Layers and in Assets.
- **Responsive width:** three breakpoints at 300 / 400px.

### Penpot right sidebar

Source: `penpot/frontend/src/app/main/ui/workspace/sidebar/options.cljs`, `options/menus/*.cljs`, `.../shapes/*.cljs`.

- **Three tabs:** Design · Prototype · Inspect (read-only).
- **Per-shape dispatch:** `options.cljs` routes to a shape-specific component file. A rectangle (`rect.cljs`) exposes: Layer · Measures · Layout Container · Grid Cell (cond) · Layout Item (cond) · Constraints (cond) · Fill · Stroke · Shadow · Blur · SVG Attrs · Exports. Text adds a Typography section between Measures and Fill.
- **Control shapes:**
  - Alignment: icon button groups (`align.cljs`)
  - Size: numeric W/H with aspect-lock toggle, X/Y spinners, rotation dial + numeric, per-corner border-radius
  - Fill: ordered list of fill layers, drag-reorder, per-layer opacity + hide-on-export, add/remove
  - Typography: searchable virtualized font dropdown, weight/style, size with presets, line-height, letter-spacing, paragraph-spacing
  - Layout: Container-side (flex/grid parent properties) and Item-side (child's align-self, flex-grow, grid-area) split into two different menus
- **Visibility gating:** centralized `select-keys` extracts relevant attrs per shape; conditional sections key off layout-parent refs (is-flex-parent? is-grid-parent? is-layout-child-absolute?) — **contextual**, not just tag-based.
- **Notable differentiators vs Figma:** layered fills (CSS-cascade model), rotation dial, applied-tokens tracking through every section, explicit Layout Container vs Layout Item split.

### Current OpenCanvas state before this ADR

- **Left panel (D.3c):** tabs for Layers · Artboards · Blocks. Tree rows 24px, icon + name only, no per-row affordances. Artboards and Blocks tabs are structurally redundant (InsertRail is the creation path; Artboards-as-tab duplicates frame metadata).
- **Right panel (D.3d):** tabs for Inspector · Traits. Inspector has Position (align + X/Y + rotation numeric), Auto Layout (toggle + direction + gap + justify), Frame (clip), and a Raw CSS accordion with the legacy sector panel inside. Traits is empty in practice.

---

## Decision

### Left panel — "Layers is the panel"

1. **No tabs.** The left panel is always the layer tree. Removed: Artboards tab, Blocks tab, Traits tab (the right-side one had already been consolidated).
2. **Frames as a collapsible section at the top of Layers.** Mirrors Penpot's Sitemap slot. Inline rename (double-click) and delete (hover → Trash icon) live here so we don't lose the Artboards-tab functionality. The per-frame layer tree renders below.
3. **Penpot-shape layer rows.** 28px (our density is a touch denser than Penpot's 32px — within the ADR-0001 scale). Each row: expand/collapse chevron · tagName icon · name · eye · lock. Hover and selected states distinct. Eye + Lock fade in on hover when inactive; stay visible when toggled on. Double-click rename.
4. **Lock state storage.** A `data-oc-locked="true"` attribute on the component, not a CSS property. Round-trips through the same GrapesJS attribute plumbing as other data-* attributes; doesn't leak into export CSS.
5. **Visibility toggle writes `display: none`.** Reversed by removing the property (not setting `display: block`, which would clobber inline/flex/etc).

### Right panel — "Inspector is the panel"

1. **No tabs.** Traits tab retired; Prototype and Inspect tabs (Penpot shape) are v0.3+ scope and not yet wired.
2. **Adopt Penpot's section catalogue.** The SemanticInspector owes us these sections, added in priority order:
   1. **Layer** (new) — visibility, lock, opacity slider, blend-mode. Lives at the top so layer-state affordances aren't buried in Raw CSS.
   2. **Measures** (expanded from today's Position) — W/H with aspect-lock, X/Y, **rotation dial + numeric**, per-corner border-radius.
   3. **Layout Container** (refined from today's Auto Layout) — direction, wrap, gap, justify, align, and **grid** support when display: grid is set.
   4. **Layout Item** (new) — renders *only* when the selected component's parent is a flex/grid container. Controls align-self, flex-grow, flex-shrink, flex-basis, grid-area. Contextual like Penpot.
   5. **Fill as a stack** (refactor of today's single background-color row) — ordered list of fill layers with per-layer opacity, drag-reorder, add/remove. The first cut supports solid colours; gradients come later.
   6. **Stroke** (new) — border colour, width, style, per-side, dash pattern.
   7. **Shadow** (new) — list of box-shadows (Penpot model), each with offset/blur/spread/colour/inset.
   8. **Typography** (new, first-class) — move typography out of the Raw CSS fallback. Font / weight / size / line-height / letter-spacing / paragraph-spacing. Icons on line-height and letter-spacing per user direction.
   9. **Effects** (new) — blur, opacity as already in Layer, plus filter effects.
   10. **Exports** — scoped to individual layers and whole frames.
3. **Section visibility is contextual, not just tag-based.** Copy Penpot's model: a small `useInspectorContext(component)` hook exposes `{ isFlexParent, isGridParent, isLayoutChild, isLayoutChildAbsolute }` and each section reads it to decide whether to render.
4. **Raw CSS accordion remains** as the bottom fallback. Every CSS property stays reachable when the semantic layer hasn't shipped a control for it. It's the escape hatch, not the primary surface.
5. **Color → Fill.** "Background & border" already renamed to "Fill" in the Raw CSS sector. Once step 5 (Fill as a stack) ships, the Raw CSS Fill sector stops being the primary surface for colour and can hide by default.

### Deferred to v0.3+

- **Pages** — a top-level structural concept above frames, matching Penpot's Sitemap. The current single-page-with-many-frames model is adequate for v0.2; Pages shows up in v0.3+ alongside multi-user / multi-agent work.
- **Assets panel** — design tokens surfaced as a UI panel, components registry, reusable text styles (H1/H2/H3 as saved styles per user direction). Likely a right-panel second mode rather than a left-panel second tab, but that's an open question.
- **Prototype tab** — interaction rules, transitions. Aligns with Epic 9 multi-agent work.
- **Code tab** — a read-only CSS/HTML/JSX preview. `get_jsx` MCP tool already does this headlessly; visual surface is optional.

---

## Consequences

### Positive

- **Single mental model per panel.** No tab-hunting. The left panel is layers, the right panel is the inspector. That's the first Figma/Penpot/Sketch read-through a new user does.
- **Semantic section catalogue is enumerable.** Ten sections is a finite list; each is an independent delivery. Progress is measurable.
- **Layer-state affordances up top** (the new Layer section) stop burying visibility/lock/opacity in Raw CSS — these are the most-used controls in a design tool, and they currently require three clicks.
- **Fills as a stack** unlocks gradients, multi-background, and the "hide-on-export" pattern without a second refactor.
- **Contextual visibility gating** (Layout Item shows only for flex/grid children) keeps the inspector short without hiding things the user needs.

### Negative

- **Loss of Blocks tab.** The BlocksPanel catalogue view (all 25 blocks browsable with drag-to-canvas) is retired. Power users lose the overview; we keep the common path (InsertRail's 5 icons) and add back an Assets panel in v0.3+ if demand is real.
- **Loss of ArtboardsPanel standalone.** Rename + delete for frames now live inside the Layers panel's Frames section, not in a dedicated tab. One fewer discoverable surface; tests got simpler as a side-effect.
- **More empty states to handle.** With no component selected, the inspector has to show *something* useful — possibly frame-level controls (frame name, dimensions) or canvas-level controls (zoom %, theme). Handled in the Layer section work (step 1).
- **Wider scope for Story 7.0.** Ten sections is more than the three the story originally implied. We don't treat 7.0 as done until a meaningful majority ship — targeting at least Layer / Measures / Layout Item / Fill-as-stack / Typography.

### Risks and mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| "Fill as a stack" is a big refactor that touches every component's style data | Medium | Ship solid-fill-only first; gradient / image support is additive |
| Contextual visibility gating reads GrapesJS parent relationships that may not be cheap to query | Low | `useInspectorContext` memoises per selected component; parent checks run once per selection change, not per render |
| Without the Blocks tab, new users lose a way to discover all block types | Medium | InsertRail's popover (D.4+) can expose every block with search — Figma's `F` + search pattern |
| `data-oc-locked` attribute leaks into exported HTML when users generate production code | Low | `get_jsx` / `get_html` handlers strip `data-oc-*` before emit — add a small attrs filter there |

---

## Implementation notes (non-normative)

**File layout** (additive to ADR-0001's conventions):

```
packages/app/src/components/inspector/
  SemanticInspector.tsx       # composes sections conditionally
  InspectorSection.tsx        # reusable section shell (shipped in D.3d)
  LayerSection.tsx            # D.4 (next)
  MeasuresSection.tsx         # D.4 (next, replaces Position)
  LayoutContainerSection.tsx  # D.4 (refactor of AutoLayoutSection)
  LayoutItemSection.tsx       # D.4 (new, contextual)
  FillSection.tsx             # D.5 (Fill as a stack)
  StrokeSection.tsx           # D.5
  ShadowSection.tsx           # D.5
  TypographySection.tsx       # D.6
  ExportsSection.tsx          # D.6
  useInspectorContext.ts      # parent-type awareness hook
  controls/                   # shared pieces: RotationDial, SizeField,
                              #   ColorField, NumericPair, LayersList
```

**Phase plan on top of this ADR:**

- **D.4** — Layer + Measures + Layout Item sections (three new, two of them are upgrades of current). Introduces `useInspectorContext`. Brings the rotation dial.
- **D.5** — Fill as a stack, Stroke, Shadow. Retires the Raw CSS "Fill" sector once the new section covers its use.
- **D.6** — Typography (first-class) + Exports. Closes the Typography gap the Raw CSS fallback currently owns.
- **v0.3+** — Pages, Assets, Prototype, Code, multi-select state in the inspector.

---

## Open questions (deferred)

- When multi-select is supported, does each section show a union (merged state with "Mixed" fallback) or the first-selected state? Figma shows "Mixed"; Penpot mostly does too.
- Do locked layers block selection on the canvas entirely (Figma) or merely prevent edits (weaker)? Likely the former; needs a tiny keymap hook.
- Does Pages, when it lands, become a left-panel sibling of Layers (two panes) or a switcher above Layers (one pane, two modes)? Penpot does the former; we likely want the latter to save width on small viewports.

---

## Addendum — 2026-04-18 (late): Implementation status

Phase D.3 through D.6 shipped the full section catalogue except **Effects**. Section-by-section status:

| # | Section | Status | Commit(s) | Notes |
|---|---------|--------|-----------|-------|
| 1 | **Layer** | ✅ Shipped | `269df21` (D.4) | Visibility (Eye / EyeOff writing `display: none`), lock (`data-oc-locked="true"` attribute, not CSS), opacity NumberInput writing fractional CSS opacity, blend-mode select. |
| 2 | **Measures** | ✅ Shipped | `a2e2753` / `f6b5336` (D.4b) | W/H with aspect-lock toggle, X/Y, custom `<RotationDial>` SVG drag control with 15° Shift-snap, per-corner border-radius with expand/collapse. Replaced the earlier lightweight "Position" section. |
| 3 | **Auto Layout** (Layout Container) | ✅ Shipped | D.3d baseline + D.4 wiring | Direction (row/column/free) ToggleGroup, gap NumberInput, justify-content ToggleGroup. Grid support pending — currently flex-only; grid containers fall back to Raw CSS. |
| 4 | **Layout Item** | ✅ Shipped (contextual) | `269df21` (D.4) | Renders only when `useInspectorContext` reports `isLayoutChild`. Controls: align-self, flex-grow, flex-shrink, flex-basis. Gated via the same hook across the ADR. |
| 5 | **Fill (as a stack)** | ✅ Shipped | `61e6c1c` (D.5) | Multi-layer `FillSection`: single layer compiles to `background-color`; multi-layer compiles to comma-separated `linear-gradient()` in `background-image`. Per-layer opacity, drag-to-reorder, hide toggle. Reads back a pre-existing 3-layer stack correctly (round-trip verified). |
| 6 | **Stroke** | ✅ Shipped | `09fc6cf` + `e5716b1` (D.5) | Colour + width + style + compound `border` shorthand round-trip. |
| 7 | **Shadow** | ✅ Shipped | `80ca8fa` (D.5) | Ordered `box-shadow` list with offset/blur/spread/colour/inset per row. Hide toggle excludes a row from compiled output. Multi-entry joins with comma. |
| 8 | **Typography** | ✅ Shipped (tag-gated) | `15cf4c9` (D.6) | `isTypographyTarget(component)` gates visibility to text-bearing tags (h1–h6 / p / span / a / strong / em / small / code / label / button / li / blockquote). Controls: font-family preset select, weight 100–900, size + line-height paired row, letter-spacing, align ToggleGroup (TextAlign Left/Center/Right/Justify), case + decoration pair. |
| 9 | **Effects** | ✅ Shipped | `e9fa5aa` (D.7) | Two rows: Blur (`filter: blur(Npx)`) and Bg blur (`backdrop-filter: blur(Npx)`). Parser preserves other filter functions in compound strings (`brightness(…) contrast(…) blur(Npx)` round-trips). Other filter functions (saturate / grayscale / drop-shadow / hue-rotate) remain reachable through Raw CSS until demand appears. |
| 10 | **Exports** | ✅ Shipped | `15cf4c9` (D.6) | Tailwind/Inline mode toggle, scoped JSX preview, Copy JSX / Copy HTML / Copy CSS buttons with "Copied" flash. Preview reuses `htmlToJsx` + `mergeStylesIntoHtml` from the `get_jsx` MCP tool — one codepath for both surfaces. |

**Shared controls catalogue delivered alongside the sections:**

| Control | Lives at | Used by |
|---------|----------|---------|
| `<InspectorSection>` | `components/inspector/InspectorSection.tsx` | Every section (20px title row, 8px padding). |
| `<NumberInput>` | `components/ui/number-input.tsx` (ADR-0001 Phase A) | Every section with a numeric property. |
| `<RotationDial>` | `components/inspector/controls/RotationDial.tsx` | Measures section. |
| `<ColorField>` | `components/inspector/controls/ColorField.tsx` | Fill / Stroke / Shadow. |
| `color-utils.ts` | `components/inspector/controls/color-utils.ts` | Fill / Stroke / Shadow. |
| `useInspectorContext` | `components/inspector/useInspectorContext.ts` | SemanticInspector + contextual sections. |
| `isTypographyTarget` | Exported from `TypographySection.tsx` itself | SemanticInspector. |

**Left panel shape** (D.3e commit `8c18c04`): single-view Layers panel (no tabs), Frames section collapsible at top with rename/delete, 28px layer rows with Eye/EyeOff + Lock/LockOpen affordances (fade-in on hover, stick visible when toggled on), double-click rename writing `custom-name` attribute, selected row highlights with `bg-oc-accent/15`. Matches the decision above to retire the Layers/Artboards/Blocks tab switcher.

**Right panel shape** (D.4c commit `d59e5e1`): single-view Inspector (no tabs), conditional on selection — right panel is entirely hidden when nothing is selected, keeping the canvas area maximized for exploration.

**Chrome** (D.4d.1 `2a592e5`, D.4d.2 `b6e6fa5`): both side panels render on a white `bg-background`; all icons route through `packages/app/src/canvas/chrome-icons.ts` using Lucide-style names but backed by Phosphor (filled, via IconContext.Provider). The late-night `7a9f808` commit routes three flex-distribution icons through Lucide as a fallback — see [ADR-0001 Phase D addendum](./0001-frontend-ui-stack.md#addendum--2026-04-18-late-phase-d-reality--icon-stack-amendment) for the mixed-stack rationale.

**Test coverage:** 30 Playwright specs across `e2e/story-d4-*`, `story-d4b-*`, `story-d5-*`, `story-d6-*`, `story-d7-*`. Full D-series suite runs in ≈55s; all pass on main as of `e9fa5aa`.

**Remaining work under this ADR:**

- **Grid support in Auto Layout** — currently flex-only; grid containers fall back to Raw CSS. Partially addressed by `useInspectorContext.isGridParent`, which already signals the state but doesn't yet drive a dedicated UI.
- **Applied tokens display per section** — Penpot threads design tokens through every section (Fill / Stroke / Typography display the token name when a variable is bound). The Variables editor UI landed in Story 6.2 (`477070e`); wiring token-aware readbacks into each section is a follow-up.
- **`<AlignmentPad>` + `<SizeField>`** — deferred from ADR-0002. Reopens when a second call site appears for either control.

Every section from the decision list has shipped. The three-phase plan (D.4 / D.5 / D.6) held, with the addition of D.4b (Measures upgrade) and D.7 (Effects closer) as necessary follow-ups once the original shapes proved too thin.

---

*End of ADR-0003.*
