ADR-0002: Inspector information architecture

**Status:** **Superseded by [ADR-0003](./0003-panel-information-architecture.md)** (2026-04-18)
**Date:** April 18, 2026
**Owner:** Architecture
**Related:** [ADR-0001](./0001-frontend-ui-stack.md), [ADR-0003](./0003-panel-information-architecture.md), PRD §7.1 Story 1.6 (Flex controls), PRD §8.3 Epic 7 / Story 7.3

---

## Supersession note — 2026-04-18

This ADR was accepted in spirit but never ratified before a Penpot reference survey (logged as [ADR-0003](./0003-panel-information-architecture.md)) reframed the inspector shape. The section **names** and **phase plan** below were superseded by ADR-0003; the core **principles** (semantic layer over GrapesJS, `Property.upValue` writes, collapsible Raw CSS escape hatch, selection-gated visibility) all carried forward intact.

**What ADR-0003 changed, in summary:**
- Renamed the catalogue: Alignment / Auto Layout / Dimensions / Appearance / Fill / Stroke / Effects / Context → **Layer · Measures · Auto Layout · Layout Item · Fill · Stroke · Shadow · Typography · Effects · Exports** (per Penpot's shape catalogue).
- Replaced `applicablePropertiesFor(component)` with `useInspectorContext(component)` returning `{ isFlexParent, isGridParent, isLayoutChild, isLayoutChildAbsolute }` — contextual gating based on parent-type, not just tag.
- Moved lock/visibility/opacity affordances into a dedicated top-level **Layer** section rather than scattering them across Appearance / Context.
- Split flex container controls (Auto Layout) from flex child controls (Layout Item) into two sections, as Penpot does — the original ADR implicitly rolled these together.
- Dropped `<AlignmentPad>` (3×3 grid writing both axes) and `<SizeField>` (Fixed/Fill/Hug toggle) as dedicated controls in the first pass. Both remain open for follow-up; the current implementation uses two separate ToggleGroups and raw NumberInputs respectively.

**What this ADR still documents correctly:** the layer-over-StylesProvider data flow, the rejected-alternatives rationale, the escape-hatch requirement, and the state-fork prohibition. ADR-0003 does not restate these — it builds on them.

Kept below verbatim as the historical record.

---

## Context

DesignJS today renders the right-panel inspector straight from GrapesJS `Sector` + `Property` objects (`packages/app/src/components/StylesPanel.tsx`). Every row is one CSS property. The resulting panel reads as a stylesheet editor: a flat list of `display`, `flex-direction`, `align-items`, `width`, `min-width`, `padding`, and so on.

Professional design tools — Figma and Pencil specifically, which are the reference points in [ADR-0001](./0001-frontend-ui-stack.md) and PRD §4.3 — present a **semantic inspector**: component-oriented sections (Alignment, Auto Layout, Dimensions, Appearance, Fill, Stroke, Effects, Export) with purpose-built controls (icon ToggleGroups, a 3×3 alignment pad, Hug/Fill/Fixed sizing, linked corner radius, color swatches with eye toggles). The controls compress several CSS properties into one affordance, and hide properties that don't apply to the selected element.

ADR-0001 chose the stack (shadcn/ui + Tailwind + Lucide + react-colorful + cmdk) but explicitly deferred inspector information architecture. Story 1.6 shipped the flex controls as raw GrapesJS properties and logged a comment that "a semantic Fill/Hug toggle on top of these is a polish item for Epic 7." Story 7.0 commits to icon ToggleGroups for alignment, but leaves open how the broader inspector is organized.

This ADR decides that information architecture so Epic 7 can build against it rather than each polish story re-litigating the question.

### Forces

- **Two different mental models.** A CSS-keyed inspector forces the user to translate design intent ("this column should grow to fill") into the right property (`flex: 1`). A semantic inspector does the translation. The latter is table stakes for matching Figma/Pencil.
- **Escape hatch is non-negotiable.** A semantic layer can't cover every CSS property on day one. The current sector-driven panel needs to stay reachable so advanced users can set `mix-blend-mode` or `backdrop-filter` without waiting on us to ship a control.
- **Selection is heterogeneous.** The selected component might be a raw `<div>`, a text node, an image, a form input, or a registered component instance (Epic 6). Sections should appear, disappear, or specialize based on selection.
- **GrapesJS is the source of truth for styles.** Writing styles means calling the same `upValue` / `component.addStyle()` path the existing panel uses. The semantic layer is a view concern, not a state fork.
- **The controls do not exist in shadcn/ui.** AlignmentPad, SizeField (Hug/Fill/Fixed), ColorField, CornerRadius, EffectsList — none of these are one-import components. They must be built, and ADR-0001 earmarks `components/editor/` for exactly this.

### Constraints inherited from ADR-0001 and the PRD

- Controls render inside the shadcn + Tailwind editor shell; no new styling engine.
- `react-colorful` and Lucide are already in the dependency budget.
- Epic 7 is a styling pass, not a rewrite — the semantic inspector must sit on top of the existing StylesProvider data flow, not replace it.
- v0.1 already ships with the sector-driven panel; the migration must be non-breaking for in-progress user files.

---

## Decision

DesignJS will render the right-panel inspector as a **semantic layer** composed of fixed sections, each backed by a small catalogue of purpose-built controls. The semantic layer reads from and writes to GrapesJS using the same `Property.upValue` path as the current panel. The existing sector-driven view is retained as a collapsible "Raw CSS" fallback.

### Information architecture

Sections render top-to-bottom in this order, gated by a `applicablePropertiesFor(component)` helper (introduced in Story 7.0) that already filters by tagName and GrapesJS component type. A section is hidden when none of its properties apply.

| Section | Appears when | Controls |
|---------|--------------|----------|
| **Context** | Selection is a registered component instance | Component name, Detach, Variant picker (ties to Epic 6 component registry) |
| **Alignment** | Selection has a flex/grid parent | Row of 6 icon buttons (L/C/R horizontal + T/M/B vertical) writing `align-self` / `justify-self` |
| **Auto Layout** | `display` is `flex` or `grid` | Direction toggle (row/column/wrap), 3×3 AlignmentPad (align-items × justify-content), gap SizeField, padding (H/V paired) |
| **Dimensions** | Always | W × H paired row using SizeField (Hug / Fill / Fixed) + Clip toggle (`overflow: hidden`) |
| **Typography** | Selection contains text | font-family, font-size, font-weight (ToggleGroup), line-height, letter-spacing, color (ColorField), text-align (ToggleGroup) |
| **Appearance** | Always | opacity slider, corner radius (linked by default, per-corner on toggle) |
| **Fill** | Element supports `background` | ColorField list (swatch + hex + opacity% + eye) — multiple fills stacked; `+` to add, drag to reorder |
| **Stroke** | Element supports `border` | Width SizeField, style select, color ColorField, side selector (all / T / R / B / L) |
| **Effects** | Always | Add-remove list of `box-shadow` and `filter: blur(…)` entries; each row opens a popover editor |
| **Raw CSS** | Always, collapsed by default | The existing sector-driven StylesPanel, preserved verbatim |

Explicitly **out of scope for v0.2**: Position (X/Y/rotation), Selection colors, Export, Layout guide. These are listed in ADR-0001's "aesthetic ceiling" discussion but require features that aren't on the roadmap (absolute positioning, subtree color aggregation, PNG/SVG export).

### Controls catalogue

These land under `components/editor/inspector/` in the directory already reserved by ADR-0001.

| Control | Responsibilities | Notes |
|---------|------------------|-------|
| `<SizeField>` | Sizing input with mode toggle: Fixed (unit-scoped `NumberInput`), Fill (`100%` on block, `flex: 1` in flex context), Hug (`auto`). Closes the Story 1.6 deferral. | Context-aware: in a flex child, Fill writes `flex: 1`; in a block child, Fill writes `width: 100%`. The translation table is the whole reason this control exists. |
| `<AlignmentPad>` | 3×3 button grid; selecting a cell writes the corresponding `align-items` + `justify-content` pair. Direction-aware (row vs column flips the axis). | Single control replaces two ToggleGroups when both apply. |
| `<DirectionToggle>` | row / column / row-wrap icon toggles; writes `flex-direction` + `flex-wrap`. | Lucide: `ArrowRight`, `ArrowDown`, `WrapText` equivalent. |
| `<ColorField>` | Swatch trigger → `react-colorful` popover + hex input + opacity % + eye toggle. | Handles `color`, `background-color`, `border-color`, fills list entries. |
| `<CornerRadius>` | Single input (linked) with an expand toggle revealing 4 per-corner inputs. | Linked is default; unlinked persists per component. |
| `<EffectsList>` | Vertical list of shadow/blur entries; `+` adds, row click opens popover editor, `−` removes. | Serializes to `box-shadow` / `filter` CSS. |
| `<PairedInput>` | Two `NumberInput`s sharing a label (`W H`, `X Y`, padding H/V, margin H/V) with optional lock-ratio. | Already called out in Story 7.0. |

### Data flow

```
GrapesJS Selection
      │
      ▼
  StylesProvider  ──► semantic-schema reducer  ──► SemanticInspector
      │                     (maps sectors to              │
      │                      sections; picks              │
      │                      the right control)           ▼
      │                                             Controls
      │                                                   │
      ▼                                                   │
  Property.upValue  ◄────────────────────────────────────┘
```

The semantic layer is a **view over the existing StylesProvider**. It does not introduce a parallel state store. Every control writes back through the same `upValue` call the current `PropertyRow` uses. This is a deliberate non-decision — we are not forking state ownership.

### Explicitly rejected

| Option | Reason |
|--------|--------|
| Replace GrapesJS StyleManager with a custom store | Doubles the state surface; forfeits undo/redo integration; violates "Epic 7 is a styling pass, not a rewrite." |
| Drive section visibility from component metadata alone | Fails for raw DOM elements (`<div>`, `<p>`, `<img>`) which are the majority of selections. Need the tagName-keyed fallback in `applicablePropertiesFor`. |
| Collapse Raw CSS escape hatch | Users will hit properties we haven't modeled (blend modes, filters beyond blur, grid-template-areas) before we ship controls for them. Removing the fallback strands them. |
| One generic "property editor" component that picks a control by property type | Attempted in spirit by the current `StylesPanel`. The output reads as a CSS editor, which is precisely what this ADR moves away from. Dedicated controls are the point. |
| Position / Transform section in v0.2 | Absolute positioning isn't a supported canvas mode yet. Shipping X/Y inputs that write `position: absolute; top/left` would encourage layouts that break on resize and contradict the flex-first story from 1.6. Reopen when we introduce an explicit "free position" toggle. |

---

## Consequences

### Positive

- **Story 1.6's Fill/Hug deferral closes in Epic 7** via a concrete `<SizeField>` component, not a one-off toggle.
- **Story 7.0's "icon ToggleGroups for alignment" becomes a single `<AlignmentPad>`** that compresses the two ToggleGroups into one Figma-parity affordance.
- **Selection heterogeneity is handled uniformly** through `applicablePropertiesFor` — text selections hide Auto Layout, images hide Typography, component instances grow a Context section.
- **Escape hatch stays intact.** Raw CSS remains reachable from the same panel, so advanced users are not blocked on our control coverage.
- **No state-layer rewrite.** Writes still flow through `Property.upValue`, which means undo/redo, GrapesJS events, and MCP `update_styles` keep working unchanged.

### Negative

- **Larger surface area to maintain.** Seven bespoke controls (`SizeField`, `AlignmentPad`, `DirectionToggle`, `ColorField`, `CornerRadius`, `EffectsList`, `PairedInput`) plus the section-gating helper. Budget impact lives in PRD Story 7.3.
- **`applicablePropertiesFor` becomes load-bearing.** A bug that hides Dimensions from a `<div>` breaks the inspector completely. Needs unit tests with a table of tagName → expected sections.
- **Context-aware Fill semantics** (Fill → `100%` vs `flex: 1`) introduces a small translation table that can drift from reality. Document it next to the component; keep it under ~10 lines.
- **Two UI layers over the same data** for the duration of the Epic 7 rollout. If the semantic layer ships partially, users might see a `<ColorField>` for background-color in the Fill section *and* a text input for `background-color` in Raw CSS. Mitigation: Raw CSS stays collapsed by default.

### Risks and mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Semantic section / Raw CSS divergence confuses users ("why are there two color inputs?") | Medium | Ship semantic sections *first* with Raw CSS collapsed. Document the escape-hatch intent in a one-line helper text on the Raw CSS accordion. |
| `<SizeField>` Fill semantics produce surprising CSS (writes `flex: 1` when user expects `width: 100%`) | Medium | Show the generated CSS on hover of the mode label. Make Fill mode disabled until the parent context is resolved. |
| `<AlignmentPad>` doesn't map cleanly to `display: grid` containers | Low | v0.2 scope: pad is flex-only. Grid gets the raw ToggleGroup fallback until someone builds a grid-aware variant. |
| Scope creep during Epic 7 (users request Position, Export, Selection Colors) | Medium | This ADR lists them as explicitly out-of-scope. Reference the ADR in PR review when new sections are proposed mid-epic. |

---

## Implementation notes (non-normative)

Directory layout (extending the one in ADR-0001):

```
components/editor/
  inspector/
    SemanticInspector.tsx    # top-level, renders sections
    sections/
      AlignmentSection.tsx
      AutoLayoutSection.tsx
      DimensionsSection.tsx
      TypographySection.tsx
      AppearanceSection.tsx
      FillSection.tsx
      StrokeSection.tsx
      EffectsSection.tsx
      ContextSection.tsx
      RawCssSection.tsx      # wraps existing StylesPanel
    controls/
      SizeField.tsx
      AlignmentPad.tsx
      DirectionToggle.tsx
      ColorField.tsx
      CornerRadius.tsx
      EffectsList.tsx
      PairedInput.tsx
    applicablePropertiesFor.ts
```

Icon assignments (Lucide):

- Alignment row: `AlignStartVertical`, `AlignCenterVertical`, `AlignEndVertical`, `AlignStartHorizontal`, `AlignCenterHorizontal`, `AlignEndHorizontal`
- Direction toggle: `ArrowRight`, `ArrowDown`, `WrapText`
- SizeField modes: `Square` (Fixed), `Maximize2` (Fill), `Minimize2` (Hug)
- Clip toggle: `Crop`
- Fill / Stroke eye toggle: `Eye` / `EyeOff`
- CornerRadius expand: `CornerDownRight` + expand caret
- Effects add/remove: `Plus` / `Minus`
- Fill add: `Plus` inside section header

Stagger recommendation:

1. Ship `SemanticInspector` skeleton + Context/Dimensions/Typography sections first — they unlock the visual density gains with the smallest control catalogue (Typography mostly reuses existing inputs).
2. Add Alignment + Auto Layout (AlignmentPad, DirectionToggle, SizeField).
3. Add Appearance + Fill + Stroke (CornerRadius, ColorField).
4. Effects last — it's the control with the heaviest popover UI and least user demand at alpha.

---

## Open questions (deferred)

- Does the Context section gain a "swap instance" affordance, or is that a command-palette action? Revisit when Epic 6 ships the component registry.
- Does Raw CSS default to collapsed on every selection, or remember per-user? Probably per-user in localStorage — align with Story 7.0's accordion state persistence.
- Do we expose the `applicablePropertiesFor` mapping as a plugin surface so third-party blocks can register their own inspector schema? Deferred to v0.3.
- Position / transform section: under what canvas mode does it become appropriate? Possibly when we introduce "free positioning" on artboards.

---

*End of ADR-0002.*
