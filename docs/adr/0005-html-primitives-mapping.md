# ADR-0005: HTML primitives ↔ design-tool shape concepts

**Status:** Proposed
**Date:** April 18, 2026
**Owner:** Architecture
**Related:** [ADR-0001](./0001-frontend-ui-stack.md) (UI stack), [ADR-0003](./0003-panel-information-architecture.md) (panel IA), [ADR-0004](./0004-frames-in-layer-tree.md) (frames in layer tree); PRD §5.1 (HTML/CSS-native canvas)

---

## Context

OpenCanvas is HTML/CSS-native by design (PRD §5.1, ADR-0001 §"Why this stack"): every element on the canvas is a real HTML element with real CSS. Figma and Penpot are shape-native: their primitives are vector concepts (`Rectangle`, `Ellipse`, `Text`, `Group`, `Frame`, `Path`) stored as a discriminated-union shape model. The two foundations are architecturally different.

But users coming to OpenCanvas from Figma or Penpot expect a **shape-shaped insertion vocabulary**: a Rectangle tool that produces "a rectangle," a Text tool that produces "a text," a Frame tool that produces "a frame." Today the InsertRail exposes Select / Frame / Text / Image / Button — half-aligned with Figma's vocabulary, missing Rectangle and Circle, and including "Button" which is a compound, not a primitive in any other tool.

A second, related complaint surfaced in the same review: the Text tool inserts `<p class="text-base">Text</p>`, which GrapesJS represents as a `<p>` Component with a `textnode` child Component. The textnode shows up as a stray "Box" row in the Layers tree (no `tagName` → default icon). That's an HTML-storage detail leaking into a shape-shaped UI surface.

This ADR pins down **how shape-shaped concepts map to our HTML/CSS storage**. The mapping is a permanent boundary in our architecture — every InsertRail tool, every Layers-tree label, every future primitive ships against this table.

---

## Survey: how Penpot and Figma expose primitives

### Penpot (`./penpot/`, MIT-incompatible source studied for shape only)

Per `penpot/common/src/app/common/types/shape.cljc:68–77` the shape taxonomy is a closed enum: `#{:frame :group :bool :rect :path :text :circle :svg-raw :image}`. Per `penpot/frontend/src/app/util/shape_icon.cljs:14–87` each type has a 1:1 icon mapping (`:rect → "rectangle"`, `:circle → "elipse"`, `:text → "text"`, …). Per `penpot/frontend/src/app/main/ui/workspace/sidebar/layer_item.cljs:75` text shapes are leaves — their content is a property, never a child node. Default-naming follows `"{Type} {Counter}"` per type.

### Figma

There is **no single canonical Figma "primitives ↔ HTML/CSS" document**. The mapping is assembled from the Help Center, REST API, Plugin API, Config talks, and direct observation of Dev Mode output:

| Figma primitive | Dev Mode emission | Doc status |
|---|---|---|
| Frame (Auto Layout) | `<div>` + `display: flex` + `flex-direction` / `gap` / `padding` / `align/justify` | Documented (Help Center "Use Auto Layout") |
| Frame (no Auto Layout) | `<div>` + `position: relative`, children `position: absolute` | Inferred from Dev Mode |
| Rectangle | `<div>` + `width` / `height` / `background` / `border-radius` | Inferred |
| Ellipse | `<div>` + `border-radius: 50%` | Inferred |
| Text | `<p>` for one paragraph; nested `<span>` for mixed-style runs | Partial (Help Center "Inspect text") |
| Image | `<img src>` for image fills on Rectangle; `background-image` otherwise | Inferred |
| Group | Flattened — children inherit absolute positioning from the parent Frame | Inferred |
| Vector / Boolean | Inline `<svg><path>`; complex booleans rasterise to PNG | Plugin API only |
| Constraints | `position: absolute` + `top`/`left`/`right`/`bottom` combinations | Behaviour documented; CSS output not |
| Variables | `var(--token)` if Code Syntax is configured per collection; raw value otherwise | Documented (Help Center "Use variables in Dev Mode") |

The well-documented mappings are **Auto Layout ↔ Flexbox**, **Grid (2024+) ↔ CSS Grid**, and **Variables ↔ CSS custom properties**. Everything else is reverse-engineered.

### Convergence

Despite different storage models, both tools converge on a small primitive set: Frame, Rectangle, Ellipse, Text, Image, Group, plus Vector/Path. Penpot adds Boolean. Anything more elaborate (button, card, navbar) is a *compound*, not a primitive — Penpot has no Button primitive; Figma's are user-defined Components.

---

## Decision

### 1. The mapping table

OpenCanvas exposes these shape-shaped primitives. Each maps to a specific HTML/CSS pattern stored in GrapesJS. The mapping is the **only** way fresh primitives enter the canvas via the InsertRail; HTML paste and MCP `add_components` continue to accept arbitrary HTML.

| Concept | InsertRail tool | HTML / CSS template (TODO match exactly in code) | Layer icon (chrome-icons) | Default name | Notes |
|---|---|---|---|---|---|
| **Frame** | Frame `F` | (no element — creates a new GrapesJS Frame via `createArtboard`) | `FrameCorners` | `"Frame N"` | Already shipped; matches Penpot board / Figma Frame. |
| **Rectangle** | Rectangle `R` | `<div data-oc-shape="rect" class="w-32 h-32 bg-neutral-200"></div>` | `Square` | `"Rectangle N"` | Bordered fill so it's visible against white frame; user can clear `bg-` later. |
| **Ellipse** | Ellipse `O` | `<div data-oc-shape="ellipse" class="w-32 h-32 rounded-full bg-neutral-200"></div>` | `Circle` (Phosphor) | `"Ellipse N"` | `rounded-full` is shorthand for `border-radius: 50%`. |
| **Text** | Text `T` | `<p data-oc-shape="text" class="text-base leading-relaxed">Text</p>` | `TextT` (Phosphor) | `"Text N"` (or first ~24 chars of content) | The `textnode` child Component is **hidden** from the layer tree (see §3). |
| **Image** | Image `I` | `<img data-oc-shape="image" src="" alt="" class="max-w-full h-auto" />` | `Image` | `"Image N"` | Empty src renders the broken-image placeholder until the user drops a file. |
| **Group** | Group `G` (deferred — see §6) | `<div data-oc-shape="group" class="contents"></div>` | `SquaresFour` (Phosphor) | `"Group N"` | `display: contents` so children render in the parent's layout flow — group is organisational only, like Figma. Deferred to v0.3 alongside multi-select wrapping. |
| **Frame container** *(internal)* | — | `<div>` (the wrapper component of an artboard) | (none — handled by FrameLayerRow) | (frame's name from `Canvas.getFrames()`) | Already implemented in ADR-0004; included here for the table's completeness. |

The `data-oc-shape="..."` attribute is the **load-bearing tag** that disambiguates shape-shaped primitives from arbitrary user HTML. Every concept that has a Layers-tree icon and a default-name lookup is identified by this attribute first, falling back to `tagName` (so existing `<p>` content from HTML paste also gets the Text icon).

### 2. Out of scope for this ADR (v0.2 cut)

- **Vector / Path** — requires `<svg>` authoring on canvas, which GrapesJS doesn't natively support. Punt to v0.3 alongside the browser-extension / capture work.
- **Boolean operations** — same. They depend on Vector.
- **Button as a primitive** — confirmed *not* a primitive in either reference tool. Move it to a future "Components" library (shadcn/Radix presets) that ships separately from primitives.
- **Constraints / absolute positioning toggle** — Penpot has it as a per-shape `:layout-child`; Figma Dev Mode emits `position: absolute`. We'll spec it later; today we don't expose a constraints concept.
- **Image fill on a Rectangle** — Figma collapses Rectangle-with-image-fill to `<img>`. We don't; a Rectangle stays a `<div>` with `background-image` if you set a fill. Less surprising.
- **Auto Layout's Hug / Fill / Fixed sizing modes** — partially shipped via Story 1.6's flexbox controls; the Penpot/Figma sizing-mode toggle (Hug / Fill / Fixed) is Story 7.0 territory (see ADR-0003).

### 3. Hide GrapesJS textnodes from the Layers tree

The `textnode` Component type GrapesJS uses to hold text content is an HTML-storage artifact, not a user-facing concept. Two changes:

1. **Filter `type === "textnode"` out of `LayerRow.children`** in [`packages/app/src/components/LayersPanel.tsx`](../../packages/app/src/components/LayersPanel.tsx). Same filter goes into `FrameLayerRow.children`.
2. **Compose the parent's row label from textnode content** when the parent is a text-bearing primitive (`<p>`, `<h1>`–`<h6>`, `<span>`, `<a>`, `<button>`, `<label>` — anything with `data-oc-shape="text"` or one of those tagNames) and has exactly one textnode child. Show the first ~24 characters of the textnode's `content`, ellipsis if truncated. Falls back to "Text" if empty.

Both changes are pure UI — no Component-model surgery.

### 4. Naming convention: per-shape counter, per-frame scope

Adopt Penpot's `"{Concept} {N}"` pattern. The counter is per-`data-oc-shape` per-frame: a fresh `<div data-oc-shape="rect">` inserted into Frame A counts that frame's existing rectangles to compute `N`. New `createPrimitive(editor, "rect")` helper in `packages/app/src/canvas/primitives.ts` (new file) owns this logic.

Already-named components retain their custom names; the counter only assigns names on **fresh** insertion. The PRD's existing custom-name plumbing (`set("custom-name", value)` in LayerRow.commit, see [`LayersPanel.tsx`](../../packages/app/src/components/LayersPanel.tsx)) is the storage.

### 5. InsertRail expansion (deferred to a follow-up commit)

Today's InsertRail order: Select / Frame / Text / Image / Button. Target:

`Select` `V` · `Frame` `F` · `Rectangle` `R` · `Ellipse` `O` · `Text` `T` · `Image` `I`

Drop `Button` from the rail (it stays accessible via the BlocksPanel under "Form" — and per ADR-0003 the BlocksPanel was retired, so Button moves into a future Components library or back into a v0.3 Assets panel). Defer `Group` to v0.3 (rare insert path; usually created via "wrap selection in group" gesture, which we don't have yet).

### 6. The mapping is **additive**, not exclusive

HTML paste, the MCP `add_components` tool, and the BlocksPanel all continue to accept arbitrary HTML. A user can paste any `<aside class="…">` and it'll render correctly on the canvas; it just won't have a `data-oc-shape="..."` attribute, so the Layers tree falls back to `tagName`-based labelling and the default `Box` icon for unmapped tags. The mapping is for the *insertion-from-toolbar* path and for *layer-tree affordances*, not for accepting input.

---

## Consequences

### Positive

- **One canonical source of truth** for the shape-shaped vocabulary. Every contributor knows where to find it.
- **The Layers tree stops leaking HTML-storage details** (textnodes, default `Box` icons for content nodes). Users who came from Figma / Penpot see what they expect.
- **Per-shape, per-frame counter naming** scales to scenes with dozens of primitives without name collisions or guessing-game UX.
- **The `data-oc-shape` attribute is also a useful agent-facing signal** — MCP tools can target "every text shape" without grepping tagNames, and `get_jsx` can decide whether to inline content vs preserve children based on it.
- **Avoids over-promising.** Vector / Boolean / Group / Constraints are explicitly out of scope; we don't quietly half-ship them.

### Negative

- **Two ways to represent the same visual.** A `<div>` with `border-radius: 50%` *without* `data-oc-shape="ellipse"` (e.g. from HTML paste) is visually a circle but won't get the Circle icon in Layers. Mitigation: tagName + class-pattern fallback in icon lookup if it gets noisy.
- **`data-oc-shape` ships in the exported HTML** unless filtered. We already strip `data-gjs-*` in `get_html` / `get_jsx` (per ADR-0003 risk-mitigation table); same filter rule applies — strip `data-oc-*` before emit.
- **The mapping table is now load-bearing** — every new primitive (when Vector lands in v0.3, when Boolean lands in v0.3+) requires updating this ADR plus the icon registry plus the naming counter logic. Three coordinated edits per primitive.
- **Button-as-primitive removal might surprise current users** who picked it from the InsertRail. Mitigation: keep the BlocksPanel (or its successor Components library in v0.3) as the canonical Button creation path; the InsertRail change is a *narrowing*, not a feature loss.

### Risks and mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `data-oc-shape` collides with a real user attribute | Low | `data-oc-*` namespace already reserved (per ADR-0003 §"Lock state storage" using `data-oc-locked`); document the namespace as ours |
| Per-shape counter walks the entire frame's wrapper on every insert (O(N) per insert) | Low | N is small (typical scene < 50 nodes); revisit if it shows up in profiles |
| HTML paste with semantic `<p>` / `<h1>` from v0 / Bolt should still get the Text icon, not Box | Medium | Icon resolution: `data-oc-shape` first, then `tagName` (existing behaviour), then default |
| Future addition of Vector / Boolean drags `<svg>`-on-canvas complexity into GrapesJS | High | Punt to v0.3 ADR-0006; not this ADR's problem |
| The textnode-filter breaks existing tests that target textnode rows in the Layers tree | Low | None do today (verified); add a regression spec when the filter ships |

---

## Implementation plan (non-normative)

Three commits, each ~half day:

1. **`packages/app/src/canvas/primitives.ts`** (new) — owns the mapping table, the `createPrimitive(editor, type, options?)` helper, and the per-frame counter. Re-exported through `packages/app/src/canvas/index.ts` if needed.

2. **`packages/app/src/components/LayersPanel.tsx`** — filter textnode children in both `LayerRow` and `FrameLayerRow`; new `labelFor(component)` helper that derives the row label from `data-oc-shape` + content, falling back to current behaviour. Update `iconForTag` in [`icons.ts`](../../packages/app/src/canvas/icons.ts) to read `data-oc-shape` first.

3. **`packages/app/src/components/InsertRail.tsx`** — replace the Button tool with Rectangle + Ellipse, route every tool through `createPrimitive`. Add the keyboard shortcuts. Drop `BUTTON_HTML` constant.

E2E coverage in a new `e2e/story-adr0005-primitives.spec.ts`:
- Each InsertRail tool produces a component with the right `data-oc-shape` and the right initial classes.
- A fresh insert of Rectangle gets name "Rectangle 1", a second is "Rectangle 2", a Text in between doesn't share the counter.
- Layer tree shows no textnode rows for the new Text primitive.
- Layer tree label for Text is the content first ~24 chars.

PRD update: log the ADR under "v0.2 Phase E: primitives mapping," and update the 4.4-row notes to mention the InsertRail Button removal.

---

## Open questions

- **Group as `display: contents` vs as a styled `<div>`.** `display: contents` makes the group invisible to the box model but lets it act as a layer-tree organiser. Worth confirming this works for nested flex/grid before committing.
- **What to do when a user pastes a `<p>` from v0 — does it pick up `data-oc-shape="text"` automatically?** Probably yes (heuristic on text-only single-element paste), but adds magic. Leave it out for v0.2 and revisit if users complain.
- **Should `createPrimitive` take a `target` (parent) param** the way `add_components` does? Useful for "create rectangle inside the selected frame" flows; out of scope for the first cut.
- **Naming counter: is per-frame the right scope, or per-page?** Pages don't exist yet (v0.3+, per ADR-0003). Per-frame is the right scope today; revisit when Pages lands.

---

*End of ADR-0005.*
