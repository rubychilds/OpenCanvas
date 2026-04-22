# ADR-0009: Design tokens — data model, modes, CSS emission, agent surface

**Status:** Proposed
**Date:** April 22, 2026
**Owner:** Architecture
**Related:** [ADR-0001](./0001-frontend-ui-stack.md) (Tailwind v4 CDN in iframe), [ADR-0003](./0003-panel-information-architecture.md) (Assets panel deferred — the home for grouped tokens UI), [ADR-0007](./0007-user-extensibility.md) (kits + Tailwind `@theme`-file theming), [ADR-0008](./0008-figma-import-strategy.md) (Figma relay — Variables flow via `get_variable_defs`); PRD Story 6.2 (Design tokens / CSS variables — partially shipped, category-grouping + mode-aware AC still open)

---

## Context

Story 6.2 shipped a **flat `Record<string, string>`** store of CSS custom properties. Today's model:

```ts
// packages/app/src/canvas/variables.ts
const store = new Map<string, string>();
// e.g. { "--brand-primary": "#ff3366", "--space-4": "16px" }
```

Values are raw CSS strings; keys auto-prefix with `--`. Writes iterate every frame's iframe `:root` via `setProperty`. Persisted under the `cssVariables` sidecar field in `.designjs.json` (via `getExtras` on the persistence channel). MCP surface is `get_variables` + `set_variables` returning the flat map.

That shape is fine for v0.1 alpha — it's the minimum that round-trips. It has **eight visible gaps** against what competitors and interchange formats support:

| Dimension | DesignJS today | Gap |
|---|---|---|
| 1. Data model | Flat `Record<string, string>` | No typed metadata |
| 2. Types | None — every value is a raw CSS string | No color / dimension / duration distinction; no validation |
| 3. Collections / groups | Flat list in one category | Story 6.2 AC open — "grouped by colors / spacing / typography / shadows / borders" |
| 4. Modes / themes | Single `:root` state | No dark/light/density/brand variants of the same token |
| 5. Aliases | CSS-native `var(--x)` works but we don't track the graph | No "edit source, all consumers update" UX; agents can't introspect the graph |
| 6. CSS output | Custom props on iframe `:root` | No Tailwind v4 `@theme` emission → no auto-generated utilities |
| 7. Agent / API | MCP `get_variables` / `set_variables`, merge semantics, flat map | No type-aware set, no mode-scoped set, no alias resolution |
| 8. Interchange | `.designjs.json` sidecar only | No W3C DTCG, no Tokens Studio, no Style Dictionary, no Figma Variables round-trip |

This ADR picks the v0.3 / v0.4 evolution — the internal data model, the mode system, the CSS emission strategy, the agent-facing tool surface, and the import/export plan. It's load-bearing because:

1. Cross-tool compatibility (Figma Variables ⇄ DesignJS ⇄ Tokens Studio ⇄ Style Dictionary) is only cheap if the on-disk schema is right up front. Migrating the schema mid-cycle costs us the sidecar's round-trip guarantee (Story 6.2 open AC).
2. The v0.3 Assets panel (deferred in ADR-0003) needs this decided before it can show category groups.
3. Tailwind v4's `@theme` directive makes **token → utility** trivial if our emission targets it directly. Getting this right means `bg-brand-500` just works across the canvas without any extra user plumbing.

---

## Survey

### Figma Variables (2023 onward)

Authoritative refs: [help.figma.com/Overview-of-variables](https://help.figma.com/hc/en-us/articles/15145852043927-Overview-of-variables-collections-and-modes), [developers.figma.com/Variable](https://developers.figma.com/docs/plugins/api/Variables/), [VariableCollection](https://developers.figma.com/docs/plugins/api/VariableCollection/).

Two plugin objects — `Variable` and `VariableCollection`. Value lookup is always `(variable, modeId) → value | VariableAlias`:

```ts
interface Variable {
  id: string; name: string;
  variableCollectionId: string;
  resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
  valuesByMode: { [modeId: string]: RGBA | number | string | boolean | VariableAlias };
  scopes: VariableScope[];             // "ALL_FILLS", "CORNER_RADIUS", ...
  codeSyntax: { WEB?: string; ANDROID?: string; iOS?: string };
  description: string; hiddenFromPublishing: boolean;
}
interface VariableAlias { type: "VARIABLE_ALIAS"; id: string; }
```

- **4 primitive types.** No shadow / gradient / typography / composite — those stay in Figma *Styles*.
- **Collections carry modes.** `VariableCollection { modes: {modeId,name}[], defaultModeId, variableIds }`. Flat within a collection; hierarchy via `/`-delimited names or multiple collections.
- **Aliases** cross-collection, resolved lazily; cycles rejected; alias-to-alias allowed.
- **Dev Mode CSS:** emits `--collection-name/variable-name` custom props, uses `var(--…)` in generated CSS; `codeSyntax.WEB` overrides the emitted name.
- **Unique `scopes` field** restricts where a variable can be bound (keeps a spacing token from leaking into a fill). No ecosystem equivalent.
- **No native JSON export.** Interchange goes through Tokens Studio or similar bridges.

### W3C Design Tokens Community Group (DTCG)

Authoritative: [tr.designtokens.org/format](https://tr.designtokens.org/format/), [design-tokens/community-group](https://github.com/design-tokens/community-group).

Nested JSON, token leaves identified by `$value`:

```json
{
  "color": {
    "brand": {
      "primary": { "$type": "color", "$value": "#ff3366", "$description": "Primary" },
      "hover":   { "$value": "{color.brand.primary}" }
    }
  }
}
```

- **9 primitive types** — `color` · `dimension` · `fontFamily` · `fontWeight` · `duration` · `cubicBezier` · `number` · `strokeStyle` plus **5 composite** — `border` · `transition` · `shadow` · `gradient` · `typography`. `$type` inherits down groups.
- **Arbitrary nesting**; dotted path = canonical id.
- **Modes are NOT in the core spec.** Handled via `$extensions` — Tokens Studio uses `themes`, Style Dictionary uses `modes`. Proposal active; marking as "unclear for v1."
- **Aliases:** `{group.subgroup.token}` curly-brace strings; chains allowed; must resolve to same `$type`.
- **Format only — no runtime API, no CSS emission spec.** Emitters like Style Dictionary, Cobalt UI, Terrazzo do the `--group-token` kebab conversion.
- **Primary value prop = interchange.** Round-trips across Figma (via Tokens Studio), Style Dictionary, Supernova, Specify, Penpot.

### Tokens Studio + Style Dictionary

Both are ecosystem context, not direct competitors:

- **Tokens Studio** (Figma plugin) — richer type set beyond DTCG (`sizing`, `spacing`, `borderRadius`, `borderWidth`, `opacity`, `boxShadow`, `asset`, math expressions `{spacing.base} * 2`). Adds "token sets" (layered files) + "themes" (named combinations of sets) — richer mode model than Figma's. Syncs into Figma Variables by turning each theme into a Figma mode.
- **Style Dictionary** — transforms/filters/formats pipeline from nested JSON to CSS / SCSS / iOS / Android / JS / Compose. DTCG support via v4 / `preview: "2025-01"` flag. Adopted at Salesforce, Amazon, Microsoft, Adobe Spectrum, Shopify Polaris.

We don't need to adopt either directly — DTCG compatibility is enough to pick both up for free.

### Pencil.dev

Verified from MCP schema: `get_variables(filePath) → { variables, themes }`; `set_variables({ filePath, variables, replace? })` — "theme axes and values that aren't yet present… will be automatically registered." Themes are **first-class multi-axis**, auto-registered. Axes ≈ modes (light/dark, density, brand). Aliases unclear from the schema; sync with `globals.css` appears to be **agent-orchestrated** (the tool returns tokens, the agent writes the file) — not an editor-side watcher.

Takeaway for us: Pencil ships the mode model we want, in a shape that's friendly to agents. Their `get_variables` returning *both* `variables` and `themes` in one call is worth mirroring.

### Paper.design — **unverified**

Research agent's WebFetch was denied; could not fetch [paper.design/docs](https://paper.design/docs) directly. What's documented publicly elsewhere: Paper emphasises **OKLCH** in its colour UI and has a design-tokens MCP surface — but whether the token data model stores `oklch(L C H)` as structured fields vs a CSS string is **unclear**, and the tool signatures are unverified. Flagged as Open Question #1. Does not block the decision for v0.3 since we're adopting DTCG either way; confirming Paper's shape matters for the Figma-relay narrative (ADR-0008) and for any future Paper ⇄ DesignJS agent workflows.

### Tailwind v4 `@theme`

Verified from [tailwindcss.com docs](https://tailwindcss.com/docs/theme):

```css
@theme {
  --color-mint-500: oklch(72% 0.11 178);
  --spacing-4: 1rem;
  --font-sans: "Inter", ...;
}
```

- Each token does **double duty** — a real `:root` `--color-mint-500` *and* auto-generated utilities (`bg-mint-500`, `text-mint-500`, `border-mint-500`…). This is the superpower we want to target.
- **Namespaces drive utility generation** — `--color-*` → colour utilities, `--spacing-*` → padding/margin/width/height, `--font-*` → family, `--text-*` → size, `--radius-*` → rounded, `--shadow-*`, `--breakpoint-*` → variants, `--animate-*`.
- **Reset:** `--color-*: initial;` wipes a namespace; `--*: initial;` wipes all.
- **Inline aliasing:** `@theme inline { --font-sans: var(--font-inter); }`.
- **`tailwind.config.js` deprecated.** Loadable via `@config "./tailwind.config.js"` for migration; CSS is the canonical config surface.
- **No first-class modes, types, or aliases** in the Figma / DTCG sense. Modes are standard CSS — `@media (prefers-color-scheme: dark)` or a `.dark` class overriding the same `--color-*`.

### Convergence table

| Dimension | Figma Variables | DTCG | Tailwind v4 `@theme` | DesignJS today |
|---|---|---|---|---|
| Data model | `Variable` + `Collection`, `valuesByMode` map | Nested JSON, `$type`/`$value` | Flat custom props in `@theme { }` | Flat `Record<string, string>` |
| Types | 4 primitive | 9 primitive + 5 composite | None (namespace-by-naming) | None |
| Collections | Per collection flat | Arbitrary nesting | None | None |
| Modes | N per collection | Not in core | Via standard CSS | None |
| Aliases | `VariableAlias` | `{path.to.token}` | `@theme inline` + `var()` | CSS-native `var()` |
| CSS output | `--collection/name`, `codeSyntax` override | Not specified | **Double duty — custom prop + utility** | `--token` on `:root` |
| API | Plugin API + REST (Enterprise) | File format only | CSS directive | MCP `get_variables` / `set_variables` |
| Interchange | Via Tokens Studio → DTCG | Native (primary value prop) | None | Sidecar only |

**Implication:** DTCG is the only realistic **on-disk** format; Tailwind v4 `@theme` is the only realistic **CSS output** format; Figma Variables is the only realistic **import** format (via ADR-0008's relay). All three can coexist — they operate at different layers.

---

## Decision

### 1. Adopt DTCG as the internal data model

Switch the `cssVariables` sidecar from flat map to **DTCG-shaped nested JSON** (`$type` / `$value` / `$description` / `$extensions`) starting in v0.3. Example:

```json
{
  "tokens": {
    "color": {
      "brand": {
        "primary": { "$type": "color", "$value": "#ff3366" },
        "hover":   { "$value": "{color.brand.primary}" }
      },
      "surface": { "$type": "color", "$value": "#ffffff" }
    },
    "spacing": {
      "4": { "$type": "dimension", "$value": "1rem" }
    }
  }
}
```

Stored at a new `tokens` key in `.designjs.json` (the existing `cssVariables` field becomes deprecated — see §8 for migration). Authoritative format on disk, in memory, and over the MCP wire.

### 2. Type system — primitives in v0.3, composites in v0.4

v0.3 ships **7 primitive DTCG types**: `color` · `dimension` · `number` · `duration` · `cubicBezier` · `fontFamily` · `fontWeight`. Ships enough for colour / spacing / typography tokens — which covers Story 6.2's open AC group list ("colors, spacing, typography, shadows, borders") for four of five categories.

**`strokeStyle`** (DTCG primitive) ships in v0.4 alongside the composites. The full DTCG composite set — `border` · `transition` · `shadow` · `gradient` · `typography` — ships in v0.4 so shadow and border groups work in the Assets panel. Until then, shadow and border values can be stored as `$type: "string"` (escape hatch) with a linter warning.

Typed values for v0.3:
- `color` — accepts hex, `rgb()`, `rgba()`, `hsl()`, `hsla()`, `oklch()`, `lab()`. Round-trips through Figma Variables' `RGBA` struct via a CSS-string ⇄ RGBA converter on the relay edge.
- `dimension` — accepts `px`, `rem`, `em`, `%`, `vh`, `vw`, `fr`. Stored as CSS string; validation on write.
- `duration` — `ms` / `s`; `cubicBezier` — 4-value array.

### 3. Modes — Figma-shaped, stored as DTCG `$extensions`

DTCG core doesn't specify modes. We adopt **Figma's shape** (N modes per collection; each token holds one value per mode) stored under `$extensions.designjs.modes`:

```json
{
  "tokens": {
    "color": {
      "surface": {
        "$type": "color",
        "$value": "#ffffff",
        "$extensions": {
          "designjs.modes": { "dark": "#0a0a0a", "hc": "#000000" }
        }
      }
    }
  },
  "$extensions": {
    "designjs.collections": {
      "color": { "modes": ["light", "dark", "hc"], "defaultMode": "light" }
    }
  }
}
```

`$value` is always the default-mode value; other modes live under `$extensions.designjs.modes.<modeId>`. Keeps on-disk files DTCG-parseable by external tools (they'll see the default, ignore the extensions) while preserving mode fidelity for DesignJS's own tooling and Figma round-trip.

Token-set composition (Tokens Studio's richer model) is **deferred to v0.5** — modes cover the 80% case; composition is an advanced-user follow-up.

### 4. Aliases resolved lazily; agents see the graph

Alias values use DTCG's `{path.to.token}` syntax. Resolution is lazy (at CSS-emission time and at MCP-read time), recursive (alias-to-alias allowed), cycle-checked (loop → error, token falls back to the literal string form of the alias). The MCP surface exposes a new `resolve_alias` tool for agents that want the concrete value without re-implementing resolution:

```ts
resolve_alias({ tokenPath: "color.brand.hover", mode?: "dark" })
  → { value: "#ff3366", chain: ["color.brand.hover", "color.brand.primary"] }
```

Round-trips with Figma Variables aliases via ADR-0008's relay (Figma's `VariableAlias` → DTCG `{…}` string).

### 5. CSS emission — Tailwind v4 `@theme` dual-emit

At runtime, the token store emits **two artefacts** into the iframe:

1. **A `<style>` with `@theme { }`** for tokens whose group path matches a Tailwind namespace (`color.*` → `--color-*`, `spacing.*` → `--spacing-*`, `font.*` → `--font-*`, `radius.*` → `--radius-*`, `shadow.*` → `--shadow-*`, `text.*` → `--text-*`). These tokens automatically generate Tailwind utilities — `bg-brand-primary`, `p-4`, `rounded-lg` — *for free* without user plumbing.
2. **A `<style>` with plain `:root { --token: value; }`** for tokens outside Tailwind's namespaces. These are still addressable via `var(--token)` in user CSS but don't auto-generate utilities.

Modes emit per-mode via CSS attribute selectors:

```css
@theme {
  --color-brand-primary: #ff3366;
}
:root[data-designjs-mode="dark"] {
  --color-brand-primary: #ff6b8a;
}
```

The canvas sets `data-designjs-mode` on the `:root` element to switch the active mode. Mode switching is a local editor UI (Topbar dropdown, stretch goal for v0.3); not persisted to `.designjs.json` beyond the default-mode pointer in `$extensions.designjs.collections`.

### 6. Agent surface — new typed tools, old tools deprecated

New tools alongside the existing flat ones:

- `get_tokens({ mode?: string, resolve?: boolean })` → DTCG-shaped JSON. `resolve=true` chases aliases; default returns the raw tree with alias strings intact.
- `set_tokens({ tokens: DTCGTree, mode?: string, replace?: boolean })` — merges by default; `replace` swaps the whole tree (Pencil's pattern).
- `resolve_alias({ tokenPath, mode? })` — as §4 above.
- `list_modes({ collection?: string })` → per-collection mode list + default.
- `set_mode(modeId)` — switches the canvas preview; equivalent to clicking the Topbar dropdown.

The **existing `get_variables` / `set_variables` tools stay** for backwards compatibility, returning / accepting a flat view derived from the DTCG store (default mode, aliases resolved). Marked `@deprecated` in the MCP tool descriptions; removed in v0.5 with a migration guide.

Pattern borrowed from Pencil: a single `get_tokens` response includes both the tree and the available modes, so agents don't round-trip to discover what modes exist.

### 7. Import / export

Three surfaces, different priorities:

- **DTCG JSON — ✅ ship in v0.3.** Drop a `tokens.json` at the project root; canvas picks it up on load. Write-back via Cmd+Shift+E → downloads a DTCG file. Matches Tokens Studio out of the box (they speak DTCG post v2).
- **Figma Variables — ✅ ship in v0.3, via ADR-0008 relay.** Agent reads Figma's `get_variable_defs` (Dev Mode MCP server), translates, calls our `set_tokens`. The RGBA-to-CSS converter + mode-mapping happens in the agent step. Quality ceiling: tokens visible to Dev Mode MCP's selection scope. Relay docs (ADR-0008 Path A deliverable) get a "Importing Figma Variables" section.
- **Style Dictionary emission — ⚠️ deferred to v0.4.** Our DTCG-shaped store is directly ingestible by Style Dictionary, so users who want Android / iOS / JS emission can just feed `tokens.json` to Style Dictionary themselves. No DesignJS-owned CLI in v0.3.

### 8. Migration from the flat `cssVariables` sidecar

On load, if `.designjs.json` contains a `cssVariables` flat map and **no** `tokens` DTCG field, we **auto-migrate in memory** with a conservative shape inference:

- Keys matching `--color-*` or values parseable as colours → `$type: "color"`.
- Keys matching `--space-*`, `--padding-*`, `--margin-*`, `--radius-*`, values ending in valid CSS length units → `$type: "dimension"`.
- Keys matching `--font-*` → `$type: "fontFamily"` or `fontWeight` based on value shape.
- Everything else → `$type: "string"` (escape hatch).

Grouping uses kebab-segments: `--color-brand-primary` → `color.brand.primary`.

On next save, the file is written with `tokens` populated and `cssVariables` omitted. A one-time migration log fires to `console.info` for maintainer visibility. This is the same silent-migration pattern we use for other sidecar evolutions (pattern established by the Story 6.2 `getExtras` channel).

Projects not migrated yet continue to work via the deprecated `get_variables` / `set_variables` shape — no forced migration.

---

## Consequences

- **Interchange unlocks.** DesignJS gains tokens round-trip with Tokens Studio, Style Dictionary, and (via ADR-0008 relay) Figma Variables. Doesn't ship as a DesignJS feature we market — it's a platform primitive that future features assume.
- **Tailwind utilities just work.** Users set a color token, get `bg-brand-primary` in the block palette and in agent-generated HTML without extra plumbing. The `@theme` emission is ~20-line runtime code; the value prop is disproportionate.
- **MCP surface grows by 5 tools** (`get_tokens`, `set_tokens`, `resolve_alias`, `list_modes`, `set_mode`). From 20 tools → 25. Deprecated `get_variables` / `set_variables` still surface, bringing tool-count visible to agents to 27 during the transition window.
- **Assets panel in v0.3 can group by `$type`** per Story 6.2's open AC — the grouping key is the DTCG type field, not a separate "category" dimension we'd have to invent.
- **Mode-switching UX is a small editor feature** — Topbar dropdown + a `data-designjs-mode` attribute + CSS attribute-selector overrides. Isolated concern; not coupled to the data model work.
- **v0.3 scope grows by ~1 week** over the minimal "add grouping" option. Trading a 3-day schema band-aid (v0.3-early) for a 1-week schema-plus-emission effort (v0.3-mid) that doesn't need revisiting at v0.4 or v0.5.
- **Composite types missed in v0.3** — shadow / gradient / typography tokens fall back to `$type: "string"` until v0.4. Tokens Studio files that use composite types ingest as strings, which is lossy but not broken (values still render correctly via the CSS emitter; they just don't participate in the type system).
- **The `tokens.json` project-root file overlaps `designjs.theme.css`** (ADR-0007). Resolved: `tokens.json` is the source of truth; `designjs.theme.css` is the emitted / generated artefact. Users who edit `designjs.theme.css` by hand get their changes preserved *only* if they're outside the `@theme` block we manage. The block comments itself: `/* auto-generated from tokens.json — do not edit */`.

---

## Open questions

1. **Paper.design verification.** Research agent's WebFetch was denied; could not confirm Paper's token-model schema, MCP tool signatures, or OKLCH structural representation. Non-blocking for v0.3 (we're adopting DTCG regardless), but worth verifying before the relay docs ship — Paper is our closest architectural sibling and we want cross-tool agent workflows to round-trip if possible. Action: re-run the research agent once WebFetch is re-enabled, or consult Paper's OSS components repo directly.

2. **Scope field — v0.4?** Figma's `scopes: ["ALL_FILLS", "CORNER_RADIUS", …]` prevents a spacing token from being applied to a fill. Not in DTCG core. Worth adopting as an `$extensions.designjs.scopes` string[] in v0.4 once the inspector can enforce it. Deferring for now.

3. **OKLCH / lab / Display P3.** v0.3 stores colours as CSS strings — `oklch(72% 0.11 178)` is a valid `$value` for `$type: "color"`. Tailwind v4 also supports OKLCH natively. Good enough. Follow-up Q: when we eventually round-trip with Figma Variables (which stores `RGBA`), do we lose OKLCH precision on export? Likely yes — flag it in the relay docs: "OKLCH values may be clamped to sRGB when exporting to Figma." Non-blocking.

4. **Token-set composition (Tokens Studio's richer model) — v0.5?** Modes cover the 80% case. Token sets (layered files, `"theme": "Brand A + Dark"`) are a v0.5 advanced feature for users with multi-brand workflows. Deferred.

5. **Deprecation timeline.** `get_variables` / `set_variables` removal in v0.5. Is that aggressive or lenient? Depends on external agent proliferation — if third-party clients rely on the flat shape, a longer deprecation window is kinder. Default to v0.5; revisit if user feedback suggests longer.

6. **Migration for projects with cross-frame tokens.** Today `setProperty` iterates all frames (fixed in the alpha.1 regression pass). The new `@theme` emission writes a single `<style>` per frame. Is there a scenario where a frame should see a *different* set of tokens than its neighbours? None I can think of at v0.3. Flagging in case "sandbox frame" becomes a feature.

7. **Name-space collisions in Tailwind's `@theme`.** If a user defines both `color.brand.primary` (→ `--color-brand-primary`) and `color.brand-primary` (→ `--color-brand-primary`), the two collide in the emitted CSS. Proposed resolution: error at load time, surface in the Topbar via the existing variable-count badge as a red "X conflicts" marker. Small implementation item.

---

## References

### Authoritative
- [Figma Variables Plugin API](https://developers.figma.com/docs/plugins/api/Variables/)
- [W3C DTCG format spec](https://tr.designtokens.org/format/) · [community-group repo](https://github.com/design-tokens/community-group)
- [Tailwind v4 @theme docs](https://tailwindcss.com/docs/theme)
- [Pencil.dev docs](https://docs.pencil.dev) — for the mode-aware `get_variables`/`set_variables` pattern

### Ecosystem
- [Tokens Studio docs](https://docs.tokens.studio) — DTCG + extensions
- [Style Dictionary](https://styledictionary.com) — DTCG consumer / platform emitter

### Unverified (flagged Open Q #1)
- [paper.design/docs](https://paper.design/docs) — WebFetch denied during this ADR's research

### Prior art in this tree
- `packages/app/src/canvas/variables.ts` — current flat `Record<string, string>` store
- `packages/app/src/components/VariablesPopover.tsx` — current Topbar UI
- PRD Story 6.2 — the ship state this ADR evolves
- [ADR-0008](./0008-figma-import-strategy.md) — relay path for Figma Variables ingest
