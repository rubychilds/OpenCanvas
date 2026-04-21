# ADR-0004: Frames as top-level nodes inside the layer tree

**Status:** Accepted
**Date:** April 18, 2026 (Proposed → Accepted same-day after implementation in commit `61c1723`)
**Owner:** Architecture
**Supersedes:** [ADR-0003](./0003-panel-information-architecture.md) §"Left panel" item 2 (the "Frames as a collapsible section at the top of Layers" decision)
**Related:** ADR-0003 (panel IA), PRD §8.1 Epic 5 (multi-artboard canvas)

---

## Context

ADR-0003 was written after a survey of Penpot, but the survey conflated two adjacent Penpot concepts: the **Sitemap** section (which sits above the layer tree) and **boards** (Penpot's name for frames). ADR-0003 §"Left panel" item 2 read:

> Frames as a collapsible section at the top of Layers. Mirrors Penpot's Sitemap slot.

That mapping was wrong. A re-read of `penpot/frontend/src/app/main/ui/workspace/sidebar/layers.cljs` and `layer_item.cljs` (Penpot lives gitignored at `./penpot/`, MIT-incompatible source studied for shape only) confirms:

- Penpot's **Sitemap** section is *pages-only*. Pages are the higher structural tier — switching pages swaps the entire layer tree.
- **Boards (frames)** are top-level nodes *inside* the layer tree, rendered by `frame-wrapper*` (which is a `layer-item*` plus a `:type-frame` row class and a 50ms selection debounce). They are not a separate section.

A second pass surveying Figma, Sketch, and Adobe XD found the convention is universal: **Frames / Artboards / Boards are top-level nodes inside the layer tree, with Pages as a separate higher tier when present**. No mainstream design tool puts frames in a section above the layer tree. The current DesignJS shape (a `FramesSection` above the `LayersProvider` tree, see [`packages/app/src/components/LayersPanel.tsx`](../../packages/app/src/components/LayersPanel.tsx)) is an outlier with no precedent.

The user flagged this directly after living with the running app: *"We are showing frames as a separate section on the left, which I wouldn't expect. I would expect to see frames on the layers hierarchy."*

This ADR reverses ADR-0003's frame-section decision. The rest of ADR-0003 (no tabs, Penpot-shape rows, lock-via-`data-oc-locked`, visibility-via-`display: none`, the Inspector's section catalogue) stands.

---

## Decision

### 1. Retire `FramesSection` as a standalone component

Delete the `FramesSection` block at the top of `LayersPanel.tsx` (today: `LayersPanel.tsx:74-199`, `LayersPanel.tsx:430`). Frame management (rename, delete, reorder, visibility, lock) moves into the unified layer tree below it.

### 2. Render each Frame's wrapper as a top-level layer row

Walk `editor.Canvas.getFrames()` rather than reading the single `LayersProvider` `root`. For each Frame, get its wrapper Component via `frame.get("component")` (the same accessor `bridge/handlers.ts`'s `frameWrapper(frame)` already uses). Render that wrapper as a top-level `LayerRow` at depth 0; recurse over its children for nested layers. The result is a single tree where the roots are the frames.

### 3. Frame rows get a distinct icon and inline affordances

- **Icon:** `FrameCorners` (Phosphor) — the same glyph that landed in the InsertRail's Frame tool (commit `361348c`), matching Penpot's `board.svg` (square with corner ticks). Distinguishes a frame node from a regular layer node at a glance, the way Figma uses `#`.
- **Affordances:** rename (double-click), delete (hover → trash, blocked when only one frame remains), eye (visibility), lock — all the same controls every other layer row already exposes per ADR-0003. Frame rows just have the additional fact that "delete" deletes the whole frame, not just a layer inside it.
- **Visual delta:** a slightly heavier row treatment is acceptable (Penpot uses `:type-frame` for a faint background tint) but not required for the first cut. Default to "looks like any other LayerRow with a different icon" and add density tweaks later if the tree gets visually flat.

### 4. Selection model: clicking a frame row selects the frame's wrapper component

Identical to clicking any other layer. The semantic inspector then renders sections for the wrapper component (which is a body-shaped element). The Frame inspector section's "Clip content" toggle works as today on the wrapper. No special selection handling needed.

### 5. `ARTBOARDS_CHANGED` continues to drive re-renders

The custom `ARTBOARDS_CHANGED` event fired by `packages/app/src/canvas/artboards.ts`'s `createArtboard` / `deleteArtboard` / `renameArtboard` already exists for FramesSection's benefit. The new unified tree subscribes to the same event for the same purpose — re-render when the frame collection changes. No new event surface needed.

### 6. Keep `LayersProvider` for change-tracking subscriptions only, OR drop it

`LayersProvider` (from `@grapesjs/react`) wraps `editor.Layers.events.custom` so the panel re-renders when GrapesJS fires layer updates. It exposes a single `root: editor.Layers.getRoot()` — which returns the **active frame's wrapper only** (per `grapesjs/dist/index.d.ts:6581`). It cannot give us all frames at once. Two options:

- **Option A (recommended):** keep `LayersProvider` as a render-pump (subscribe to its updates so per-frame internal layer changes still trigger re-renders), but ignore its `root` value. Source of frame iteration is `editor.Canvas.getFrames()`.
- **Option B:** drop `LayersProvider` entirely and subscribe to `editor.on("component:add component:remove component:update", …)` ourselves. Lower-level but direct.

A is the smaller change and reuses the provider's debouncing. Pick A.

### 7. Pages remains a v0.3+ deferred concept

Per ADR-0003 §"Deferred to v0.3+". This ADR doesn't change that. When Pages lands, it gets its own section above the layer tree (Penpot's Sitemap shape), and frames stay as the tree roots within whichever page is active.

---

## Consequences

### Positive

- **Aligns with universal convention.** Figma, Sketch, Adobe XD, Penpot all do this. New users from any of those tools have one less "wait, where's the…?" moment.
- **One mental model for "things on the canvas."** Frames and components are both layer-tree nodes; the only difference is the icon and the fact that deleting a frame removes everything inside it. No more "managing frames is a separate thing from managing layers."
- **Frees up the section slot above the layer tree** for when Pages eventually lands. Today that slot is occupied by FramesSection; it should be reserved for the higher structural tier.
- **Drag-to-reorder frames becomes natural** (future): same drag mechanic the layer tree already supports for non-frame layers.

### Negative

- **One more section per frame's worth of vertical space**, since the frame row sits above its children rather than in a separate compact list. For a project with 10 frames, this means 10 extra rows in the tree. Mitigation: collapse-by-default for frames whose children are non-empty; keep the `FrameCorners` icon visually distinct so users can scan past collapsed frame rows quickly.
- **Reverses an accepted ADR.** The cost is being honest about why — not a face-saving "addendum" — and updating the parallel D.5 / D.6 / D.7 streams' reading of ADR-0003 if they were keying off the FramesSection clause. Ripcord: the rest of ADR-0003's left-panel decisions (no tabs, Penpot-shape rows, lock attribute, visibility-via-display) remain valid.
- **Loses the dedicated FramesSection's compact "all frames at a glance" view.** If a user wants to see just the frames without their contents, they'd have to collapse all of them in the tree. Mitigation: this is exactly how Figma works, and users do it without complaint; the Pages-style "list of frames" view, if needed later, can be a separate Inspector-side or popover surface.

### Risks and mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `editor.Canvas.getFrames()` returns frames in an unstable order across renders | Medium | Spec a Playwright test that asserts order matches `list_artboards` MCP output; if unstable, sort by frame `cid` deterministically |
| Per-frame wrapper components don't fire `component:update` events when child layers change, so the custom subscription misses updates | Low | `LayersProvider` already wraps `editor.Layers.events.custom`, which fires for any layer change anywhere — keep it as the render pump (Decision §6 option A) |
| Existing E2E specs (`story-5.1-artboards-panel.spec.ts`, `story-d4-layer-layoutitem.spec.ts`) target FramesSection's `data-testid`s and break | Medium | Update those specs as part of the implementation commit; the new tree exposes the same affordances under different test IDs (e.g. `oc-layer-row-frame-{id}` instead of `oc-frames-row-{id}`) |
| Phase B's parallel-stream agents are mid-edit on `LayersPanel.tsx` | High | Land the change as a feature branch (`feat/d8-frames-in-tree`), coordinate the merge order with the parallel streams; don't push directly to main |

---

## Implementation plan (non-normative, from spike)

### Spike findings

- `editor.Layers.getRoot()` returns a single Component — the active frame's wrapper. There is no built-in API to get a "root of roots" representing all frames.
- `editor.Canvas.getFrames()` returns the full Frame[] (already used in `artboards.ts`'s `listArtboards`).
- Each Frame model has a `.get("component")` accessor returning its wrapper Component (already used in `bridge/handlers.ts`'s `frameWrapper(frame)`).
- The wrapper's children are accessible via `wrapper.components().toArray()` (the same pattern `LayersPanel`'s render-prop already uses).

### Ordered patches

1. **New `FrameLayerRow` component** in `LayersPanel.tsx` — a `LayerRow` variant that takes a Frame model, renders the frame's wrapper as the row (with `FrameCorners` icon and the existing rename/delete/eye/lock affordances), and recurses into wrapper children using the existing `LayerRow` for nested layers.
2. **Replace the body of `LayersPanel`'s render** — wrap `LayersProvider` for subscription, but iterate `editor.Canvas.getFrames()` for the actual roots. Map each Frame to a `FrameLayerRow`.
3. **Delete `FramesSection`** and its imports / `ARTBOARDS_CHANGED` listener that's redundant with the new tree's listener.
4. **Update affected E2E specs** — at least `e2e/story-5.1-artboards-panel.spec.ts` (whose entire premise is the standalone panel) plus any spec that asserts the absence of frame rows in the layer tree.
5. **Update [`docs/adr/README.md`](./README.md)** index to add ADR-0004 with `Status: Proposed`, then flip to `Accepted` after the implementation commit lands.

Estimated effort: half-day to one day, depending on how many specs hard-code FramesSection-specific selectors.

### Verification

- Open the editor with two artboards; confirm both frame rows appear at the top of the layer tree, expandable, with FrameCorners icons.
- Add a div to one frame; confirm it nests under that frame's row.
- Rename a frame via double-click; confirm the new name persists across reload (`.designjs.json` round-trip via Story 1.5).
- Delete a frame; confirm the last-frame guard still prevents an empty canvas.
- Run `pnpm exec playwright test` and confirm only the deliberately-updated specs changed.

---

## Open questions

- **Frame row density.** Penpot uses a faint `:type-frame` row tint to make frame rows visually distinct beyond just the icon. Do we want that, or is the icon alone enough? Decide post-implementation when we can see the actual tree.
- **Drag-to-reorder frames.** Penpot supports drag-reorder of boards in the layer tree. We can either ship that with this ADR or punt it to a follow-up. Likely a follow-up — the `ARTBOARDS_CHANGED` event already supports it on the data side; the UI cost is non-trivial.
- **Frame group selection.** Should clicking a frame row select the wrapper *or* the wrapper plus all its children (a "select frame" gesture)? Figma does the former; treats children as a separate descendant click. Match Figma.
- **What replaces FramesSection's "click a frame to focus the canvas on it" affordance?** Today `FramesSection` doubles as a navigation aid. The new layer-tree row should also focus the canvas on click — wire `editor.Canvas.scrollTo(frame)` (or equivalent) on `FrameLayerRow` click, or a dedicated navigate-icon if the click should just select.

---

## Addendum (2026-04-18) — implementation notes

Shipped in commit `61c1723`. Two reality-checks worth recording:

- **`useMemo` deps for `force` setter were a latent bug.** The previous
  `LayerRow` had `[component, force]` as `useMemo` deps where `force` was
  the `useState` setter (a stable reference, never changes). The memo
  silently never re-derived after a `component:add`. The bug only
  manifested in the new `FrameLayerRow` because frames live longer and
  see more child-add events than typical layer rows. Fixed in both rows
  by destructuring `[tick, force]` and using `tick` (the value) in deps.
- **Subscriptions: split, not space-delimited.** Backbone-style
  `editor.on("component:add component:remove component:update", fn)`
  doesn't reliably attach all three on this GrapesJS version. Split into
  three individual `on/off` calls. The `LayerRow` was previously only
  subscribing to `component:update`, which means add/remove of children
  inside an existing layer wouldn't tick the row; this is now fixed too.
- **`useFrames` listens to GrapesJS native events, not just our
  `ARTBOARDS_CHANGED`.** `canvas:frame:load` and `canvas:frame:unload`
  catch raw `editor.Canvas.addFrame` calls (e.g. from MCP tools or tests
  bypassing the artboards.ts helpers). Belt-and-braces — both work today,
  but having the native event subscription means we can't accidentally
  ship code paths that mutate frames without going through our helpers
  and lose the panel sync.
- **The Layers section header gained an inline "+" affordance** during
  implementation (Penpot-style stroked PlusOutline glyph from a new
  `custom-icons.tsx`, since Phosphor's filled `Plus` doesn't match
  Penpot's `add.svg` shape). One-click new Desktop frame, replacing one
  of the old FramesSection's affordances. The icon import lives in
  `chrome-icons.ts` alongside the rest of the chrome glyphs so the rule
  "everywhere imports icons through chrome-icons" still holds.

E2E coverage in `e2e/story-adr0004-frames-in-tree.spec.ts` (7 specs, all
green first run after the `useMemo` dep fix).

---

*End of ADR-0004.*
