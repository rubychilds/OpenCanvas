# ADR-0007: Block data model, built-in UI kits, and user-extensibility

**Status:** Proposed
**Date:** April 22, 2026
**Owner:** Architecture
**Related:** [ADR-0001](./0001-frontend-ui-stack.md) (UI stack, Tailwind v4 CDN in iframe), [ADR-0003](./0003-panel-information-architecture.md) (panel IA — BlocksPanel retired to InsertRail), [ADR-0005](./0005-html-primitives-mapping.md) (HTML primitives mapping); PRD §7.1 Story 1.4 (block palette), PRD Story 3.2 (Tailwind class resolution); v0.2 feature "Per-project design files + file switcher" (depends on project-root discovery)

---

## Context

DesignJS ships **25 hardcoded blocks** across four categories (Layout / Typography / Form / Media) in [`packages/app/src/canvas/blocks.ts`](../../packages/app/src/canvas/blocks.ts). Each block is a `BlockDefinition = BlockProperties & { id: string }` with a single `content` field: a raw HTML string containing Tailwind classes. User extensibility is not supported — adding a block requires forking the repo and editing `blocks.ts`. Custom Tailwind configuration is also not supported: Tailwind v4 runs via CDN inside the iframe, and there is no mechanism to inject user `@theme` rules.

Two PRD items deferred to v0.3 crystallise the problem:

1. *Custom blocks can be defined in a config file* — Story 1.4 tail.
2. *Custom Tailwind config (colors, fonts) can be loaded via a config file* — Story 3.2 tail.

Both items are blocked pending an ADR. This ADR picks the data model, the discovery mechanism, and the built-in kit list.

The decision is **entangled with our positioning**. DesignJS is HTML/CSS-native by design (ADR-0001, PRD §5.1). Paper shares that bet; Pencil ships a Figma-shape model in a `.pen` file; Onlook edits the user's existing React code directly; shadcn's registry format treats components as file-trees of TypeScript source. The wrong choice here burns our positioning.

A secondary constraint — we want to ship ≥1 substantial component library in v0.3 so new users get something beyond the 25 primitives. The initial directive was to ship **shadcn, Halo, Lunaris, Nitro, and Base UI**. Research (§Survey below) established Halo / Lunaris / Nitro are Pencil-proprietary with no public schema or source, so the final kit list was resolved on 2026-04-22 as **shadcn, Base UI, Tremor, Park UI, and Magic UI** — five confirmed-OSS libraries covering primitives, dashboards, and animated components.

---

## Survey: how competitors model "a block"

### Figma — ComponentNode + ComponentSetNode + InstanceNode

Per the [Plugin API docs](https://developers.figma.com/docs/plugins/api/ComponentNode/):

- `ComponentNode` is the main component. Keyed by a stable `key: string`; metadata includes `name`, `description`, `descriptionMarkdown`, `documentationLinks`, `componentPropertyDefinitions`. Users create one by selecting any node and running *Create Component* (⌥⌘K) — not "every frame is a component," opt-in only.
- `ComponentSetNode` wraps multiple variants into one logical component. Variants are sibling ComponentNodes under the set, each exposing matching `componentPropertyDefinitions`.
- `InstanceNode.setProperties({ [name]: value })` mutates the current instance. Property types: `VARIANT`, `TEXT`, `BOOLEAN`, `INSTANCE_SWAP`, plus `SLOT` via `createSlot()` (settable only through `appendChild`, not `setProperties`). Property names for non-VARIANT types carry a `#<uniqueID>` suffix.

Figma's model is **strict, typed, structural**. It was designed for graphical/vector tooling and carries assumptions (slots as explicit node types, variant sets as wrapping frames) that don't map cleanly onto HTML.

### shadcn/ui — a registry of file trees

Per [`ui.shadcn.com/schema.json`](https://ui.shadcn.com/schema.json) (components.json) and [`ui.shadcn.com/schema/registry-item.json`](https://ui.shadcn.com/schema/registry-item.json):

- **`components.json`** at the project root declares `style`, `tailwind` (config path + css file), `rsc`, `aliases` (`utils`, `components`, optional `ui` / `lib` / `hooks`), optional `registries` map (e.g. `"@acme": "https://acme.com/r/{name}.json"`) for third-party registries.
- Each **registry item** has: `name`, `type` (one of `registry:ui` · `registry:block` · `registry:component` · `registry:hook` · `registry:lib` · `registry:theme` · `registry:page`), `author`, `dependencies[]`, `devDependencies[]`, `registryDependencies[]`, `files[]` (each with `path`, `content`, `type`, `target`), plus theming fields `tailwind`, `cssVars`, `css`.
- **`registry:component`** = single primitive (one `.tsx` file). **`registry:block`** = composition: a folder like `/blocks/dashboard-01/` containing `page.tsx` + dependencies. Shape is identical — `registry:block` just has multiple entries in `files[]`.
- Canonical items at `https://ui.shadcn.com/r/styles/{style}/{name}.json` (e.g. `/r/styles/new-york/button.json`).

This is the most production-proven format in the space. Its bet: **components are source code**, not structured data. Users copy-paste into their repo.

### Base UI — compound components, state via data-attributes

Per [base-ui.com/react/components](https://base-ui.com/react/components):

- ~38 components, fully unstyled / headless.
- Compound-component API: `<Dialog.Root>` · `<Dialog.Trigger>` · `<Dialog.Portal>` · `<Dialog.Popup>` etc. — not a single component with slot props.
- Parts forward refs and accept a `render` prop (equivalent to Radix's `asChild`).
- **State is exposed as DOM data attributes** — `data-open`, `data-closed`, `data-disabled`, `data-checked`, `data-highlighted`, `data-focused`, `data-valid`, `data-invalid`, `data-starting-style`, `data-ending-style`, `data-pressed`, `data-hovering`, etc. — directly selectable from CSS.

Base UI is the **most HTML/CSS-canvas-compatible** of the libraries surveyed. Because it ships zero default styles and expresses state via data-attrs, its components flatten to `<button data-disabled="" class="...tailwind...">` with no React runtime needed in the target renderer. A canvas can preview "hover" or "open" by toggling the data-attribute on the selected DOM node.

### Pencil — `.lib.pen` files (opaque)

Per [docs.pencil.dev/core-concepts/design-libraries](https://docs.pencil.dev/core-concepts/design-libraries) and Pencil's MCP server's own docstrings:

- Library files use the `.lib.pen` suffix. `.pen` files are **encrypted binary** — only accessible through Pencil's MCP tools, no public schema.
- Components are created by selecting any node and hitting ⌘⌥K (same pattern as Figma). Origin = magenta bounding box; instances = violet.
- The names **Halo / Lunaris / Nitro** do not appear in Pencil's public docs. They are likely proprietary skins maintained in-house. Only **shadcn** is unambiguously OSS among the four Pencil built-ins. The DesignJS kit list was swapped accordingly — see §Decision §2 and §Open questions §1 for the resolution.

### Paper — not publicly documented

The [paper.design manifesto](https://paper.design/manifesto) only mentions HTML as a primitive. No component-model schema, no `add_component` MCP tool documented. Base UI partnership is referenced elsewhere but the on-canvas shape is undocumented.

### Onlook — codebase is the registry

Per the [onlook-dev/onlook](https://github.com/onlook-dev/onlook) repo: components come from the user's own `src/`, discovered via AST (Babel/SWC) in `packages/parser/`. No component-manifest format, no `.lib` files — the codebase is itself the component registry. Onlook uses shadcn for its own chrome UI.

### Convergence

Two camps:

- **Data-first** (Figma, Pencil): opaque binary / JSON files, strict schema, variant-aware, editor-owned.
- **Code-first** (shadcn, Onlook): TypeScript source trees, registry items are file bundles, composition is React.

DesignJS's HTML/CSS-native positioning points at a **third camp**: the block is **an HTML fragment with Tailwind classes and optional state-preview data-attrs**. That aligns with Paper's (undocumented but consistent) bet and Base UI's flattening property.

---

## Decision

### 1. Block data model — `BlockDefinition` v2

A block is an HTML fragment with optional metadata. No React runtime, no component instances, no typed variants — variants are shipped as sibling blocks under the same category, matching the Bet C shape from the pre-ADR analysis.

Extending the current `BlockDefinition`:

```ts
export interface BlockDefinition {
  /** Stable id: "shadcn/button/primary", "baseui/dialog", "layout/flex-row". */
  id: string;

  /** Display label in the palette. */
  label: string;

  /** Tree grouping. Colon-delimited for nesting: "shadcn:buttons". */
  category: string;

  /** The block's HTML, with Tailwind classes. Rendered into a frame's wrapper on insertion.
   *  Supports {{children}} as a literal placeholder for layout-only blocks (e.g., a Flex row
   *  whose user fills in the children afterwards). */
  content: string;

  /** Optional: lucide icon name for the palette tile. */
  icon?: string;

  /** Optional: short description for the palette tooltip and MCP surface. */
  description?: string;

  /** Optional: kit id this block belongs to. null = built-in DesignJS primitive. */
  kit?: "shadcn" | "baseui" | "tremor" | "parkui" | "magicui" | string;

  /** Optional: preview data-attrs to toggle in the inspector (Base UI style).
   *  Canvas preview applies these to the outermost element of the block on drop. */
  states?: Array<{ name: string; attrs: Record<string, string> }>;

  /** Optional: links to an external canonical source (shadcn URL, Base UI docs page). */
  source?: { kind: "shadcn" | "base-ui" | "url"; ref: string };

  /** Optional: GrapesJS `stylable` gate — properties the inspector is allowed to mutate.
   *  Default: all. Used by kits that want to lock down "structural" classes users shouldn't touch. */
  stylable?: string[];
}
```

What this does *not* include (and why):

- **Typed props / variants.** A "Primary Button" and a "Secondary Button" are two separate blocks with different ids. The palette groups them under `shadcn:buttons`. This is how Pencil actually surfaces library components in its UI (per research), and it aligns with the HTML-fragment model — no runtime to resolve `variant="secondary"` into Tailwind classes.
- **Slots.** A Flex layout block can include `{{children}}` as a literal placeholder the user drops content into after insertion. No Figma-style typed slot nodes.
- **React/JSX.** Blocks are HTML strings. Agents reading blocks get HTML, not JSX. `get_jsx` (existing tool, ADR-0001) handles the HTML → JSX conversion on export.

### 2. Built-in kits shipped with v0.3

Ship **five confirmed-OSS kits** in v0.3: shadcn, Base UI, Tremor, Park UI, Magic UI — all MIT-licensed, all with public source + schemas. Halo / Lunaris / Nitro were rejected (see §Survey; resolved 2026-04-22). Concrete inclusions:

| Kit | id | Target count | Source basis |
|---|---|---|---|
| DesignJS primitives | *(no prefix, e.g. `layout/flex-row`)* | 25 (today's `DEFAULT_BLOCKS`) | Hand-written |
| shadcn | `shadcn:…` | ~50 blocks across buttons, cards, form, dialog, navigation | Flatten from `https://ui.shadcn.com/r/styles/new-york/{name}.json` into HTML fragments; MIT |
| Base UI | `baseui:…` | ~38 blocks, one per Base UI component (accordion, alert-dialog, button, combobox, dialog, menu, popover, select, …) | Flatten compound components to HTML with `data-*` state attrs preserved; MIT |
| Tremor | `tremor:…` | ~40 blocks across dashboards, charts, KPI cards, data tables, form | Flatten from Tremor's React source; Apache 2.0 (`tremor.so`, `github.com/tremorlabs/tremor`) |
| Park UI | `parkui:…` | ~35 blocks covering the Ark UI primitive set (accordion, combobox, date-picker, menu, number-input, popover, …) styled with Panda CSS recipes | Flatten from Ark UI primitives with Park UI's Panda recipes compiled to Tailwind utilities; MIT (`park-ui.com`, `github.com/cschroeter/park-ui`) |
| Magic UI | `magicui:…` | ~60 blocks across animated backgrounds, text effects, marquees, buttons-with-effects | Flatten from Magic UI's React source; MIT (`magicui.design`, `github.com/magicuidesign/magicui`). Many components depend on Framer Motion — see Open Question #5 for the runtime-dependency implications |

All six kits live at **build time** as TypeScript sources under `packages/app/src/kits/{kit}/` and are aggregated into `DEFAULT_BLOCKS` at startup in that order (primitives → shadcn → baseui → tremor → parkui → magicui). Palette groups by `category`, which kit-prefix controls.

Kit flattening is a build-time step, not a runtime React render. The flattening tool (`scripts/sync-kits.mjs`, new) reads each kit's upstream source, emits per-block `.ts` files under `src/kits/…`, and runs manually when we want to pull in registry updates. Versions are pinned per kit in a new top-level `kits.lock.json`.

Per-kit licensing notes live in `LICENSE.third-party.md`: shadcn MIT, Base UI MIT, Tremor Apache 2.0, Park UI MIT, Magic UI MIT. All five permit re-distribution of flattened HTML with attribution preserved in the per-block `source.ref` field.

### 2a. Each kit ships with a baseline token set

Kit blocks reference semantic CSS custom properties — e.g., shadcn's `Button` uses `bg-primary`, `bg-background`, `text-foreground`, all of which resolve via Tailwind v4's `@theme` emission (ADR-0009 §5) *only if* the user has tokens named `color.primary` / `color.background` / `color.foreground`. A block dropped into a canvas with no matching tokens renders with broken utilities.

To close that dependency, each kit ships a `{kit}.tokens.json` (DTCG-shaped, ADR-0009 §1) under `packages/app/src/kits/{kit}/tokens.json` — the kit's canonical default token set:

- **shadcn** — the `--primary` / `--secondary` / `--background` / `--foreground` / `--muted` / `--accent` / `--destructive` / `--border` / `--input` / `--ring` / `--radius` set, matching [ui.shadcn.com/themes](https://ui.shadcn.com/themes) defaults.
- **Base UI** — minimal; only tokens that Base UI's (few) default-styled demos consume.
- **Tremor** — the chart colour palette + dashboard semantic tokens (`--tremor-brand` / `--tremor-background` / `--tremor-content` / …).
- **Park UI** — Park's Panda recipe defaults reduced to DTCG tokens.
- **Magic UI** — animation duration / easing curves.

Merge semantics — a referenced-not-copied cascade (see ADR-0009 §7a for the full rule): kit baseline tokens form a lower cascade layer; user tokens in `.designjs.json#tokens` form an upper layer; user tokens win on name collision. **Kit tokens are never written into the user's `tokens.json`** — they load from the kit's bundled asset at CSS emission time and merge in memory only. A user's `tokens.json` stays project-scoped and clean; the kit tokens are implicit defaults that surface through the emitted CSS.

### 3. User-extensibility — project-local blocks and kits

Two discovery paths, both depend on the v0.2 **Per-project design files** feature (`get_project_context` MCP handshake returns the user's `projectRoot`):

**3a. `designjs.config.ts`** at the project root exports an optional `blocks` array and `kits` array:

```ts
// designjs.config.ts
import { defineConfig, block, importKit } from "designjs/config";

export default defineConfig({
  blocks: [
    block({
      id: "my-app/hero",
      label: "Marketing hero",
      category: "Marketing",
      content: `<section class="py-20 bg-gradient-to-br ...">…</section>`,
    }),
  ],
  kits: [
    importKit("@acme/designjs-kit"),  // npm package exporting BlockDefinition[]
  ],
});
```

**3b. shadcn-compatible `registries` map** in `components.json` (for users who already use shadcn's ecosystem):

```json
{
  "registries": {
    "@acme": "https://acme.com/r/{name}.json"
  }
}
```

The canvas watches `components.json`'s `registries` and surfaces registered items under a "From shadcn registry" palette group. Items are flattened with the same build-time logic as the built-in shadcn kit, but lazily (on first palette-expand), not eagerly.

**Merge semantics:** user blocks are added to (not replaced over) the built-in set. Id collisions are an error at load time — the error shows in the palette with a red warning tile. Categories are free-form strings; collisions are fine (user's "Marketing" merges into any existing "Marketing" group).

### 4. Tailwind v4 theming — `designjs.theme.css`

One theme file per project, injected into the iframe's `<head>` at load time:

- **Default source:** `<projectRoot>/designjs.theme.css`. If it exists, inject it into every frame's iframe `<head>` after the Tailwind CDN link.
- **Alternate source:** if `designjs.config.ts` declares a `theme` field pointing at a different path (e.g. the user's existing `app/globals.css`), use that. This lets Next.js / Vite users point the canvas at the CSS they already ship.
- The file is plain Tailwind v4 — any valid `@theme { … }` / `@layer` / `@import` directive — no DesignJS-specific schema.

Live-reload: the persistence middleware's `fs.watch` (to be added) broadcasts `theme:changed` over the bridge when the file changes; the canvas re-injects. Same update path the existing `.designjs.json` autosave uses.

### 5. State preview for Base UI blocks — `data-*` toggle in inspector

When a block with a `states` array is selected, the Appearance section of the inspector gains a **State preview** control — a dropdown listing each declared state plus "Default." Selecting a state writes the state's `attrs` onto the selected element's wrapper (e.g. `data-open=""`). Deselecting restores.

This is not persisted to `.designjs.json` — it's a preview aid, purely editor-local. On save, the current state's data-attrs are stripped.

---

## Consequences

- **Block palette triples in size** on v0.3 day one — from 25 to ~100+ entries. The existing palette UI (retired to InsertRail + a compact blocks drawer per ADR-0003) needs a search box and collapsed-by-default category groups to stay usable. Scoped as an implementation story; not a data-model issue.
- **`get_tree` output stays unchanged.** Agents see the same HTML tree they see today; kit metadata is editor-local. `add_components` still accepts any HTML — kits are not a gate.
- **MCP agents gain an `add_block` tool** (stretch, same v0.3): `add_block({ blockId, artboardId?, target? })` resolves the id against the loaded registry and calls the existing `add_components` handler with the block's `content`. Low-risk — it's a thin wrapper — and it lets agents prompt "add a shadcn Dialog" without first reading the blocks list.
- **Licensing surface grows.** Each built-in kit needs its licence notice in `LICENSE.third-party.md` (shadcn MIT, Base UI MIT). User kits imported via `designjs.config.ts` are the user's responsibility — we print a warning when loading an external kit without a declared licence.
- **Kit updates become a maintainer chore.** `scripts/sync-kits.mjs` has to run on shadcn / Base UI releases. Not automated in v0.3. CI runs it on a manual trigger only.
- **The "DesignJS is HTML/CSS-native" positioning stays intact.** No React-in-iframe, no component runtime, no typed variants. Blocks are HTML fragments — a Pencil library in shape, a Figma ComponentSet in marketing surface, neither in implementation.

---

## Open questions

1. ~~**Halo / Lunaris / Nitro — confirm or swap.**~~ **Resolved 2026-04-22:** option (a) selected — swap to **Tremor, Park UI, Magic UI** to fill the "5 kits out of the box" story. Final v0.3 kit list is shadcn + Base UI + Tremor + Park UI + Magic UI (plus the 25 DesignJS primitives). All five kits are MIT or Apache 2.0. See §Decision §2 for counts and sources. *Left here as a record of the decision, not an open question.*

2. **`designjs.config.ts` vs `designjs.config.js`.** TS is nicer to type but requires transpilation on load (esbuild inside the Vite dev server). JS is simpler. Leaning TS since Vite is already running; happy to take a patch saying otherwise.

3. **What happens when a shadcn component block is dropped and the user's project *already uses shadcn*?** Two copies of `Button.tsx` might exist — one the user wrote, one DesignJS flattened. The canvas is HTML either way, but on `get_jsx` export the agent might emit `<button className="...">` instead of `<Button>`. Punted to a future ADR on code export semantics (ADR-0008 is Figma *import*, not code export — placeholder here for when the export ADR lands). v0.3 default: always emit raw HTML + Tailwind; users who want shadcn imports can prompt the agent for them.

4. **Slot handling.** `{{children}}` is a literal text placeholder. If a block like `shadcn:card:with-header` has multiple slots (header / body / footer), we need `{{slot:header}}` / `{{slot:body}}` naming + an inspector affordance. Deferred — v0.3 ships single-slot blocks only; multi-slot is a v0.4 follow-up if users push back.

5. **Per-block Tailwind plugins.** Some shadcn blocks use `tailwindcss-animate` / `tailwind-merge` utilities not in the core Tailwind v4 CDN. Options: bundle the plugins into our hosted Tailwind build (preferred), or document the caveat and skip blocks that depend on them. Leaning preferred — Tailwind v4 plugin loading inside the iframe CDN needs a spike.

6. **Magic UI runtime dependencies.** Many Magic UI components depend on **Framer Motion** (a JS runtime, not just CSS), and some use WebGL effects. Flattening to static HTML + Tailwind loses the animation. Three sub-options for the sync-kit flattener: (a) **CSS-only subset** — skip any component whose primary value is a Framer-Motion animation; ship only the static shells (roughly 40% of Magic UI). (b) **Inject Framer Motion into the iframe** alongside the Tailwind CDN — adds ~60 KB of JS to every canvas load, meaningful cost. (c) **Flatten where possible, ship a "preview image" fallback** for motion-heavy components so they render as a static screenshot on the canvas with a "play in final build" affordance. Leaning (a) for v0.3 — skip motion-heavy components, ship the static 60%. Revisit (b) or (c) if users ask.

7. **Discovery precedence when a user has both `designjs.config.ts` AND `components.json` with `registries` set.** Proposed: both load, `designjs.config.ts` blocks take precedence on id collision. Flagged for review.

---

## References

### Schemas + APIs
- [shadcn/ui components.json schema](https://ui.shadcn.com/schema.json)
- [shadcn/ui registry-item schema](https://ui.shadcn.com/schema/registry-item.json)
- [Base UI components](https://base-ui.com/react/components)
- [Figma ComponentNode Plugin API](https://developers.figma.com/docs/plugins/api/ComponentNode/)

### Kit sources (v0.3)
- **shadcn** — https://ui.shadcn.com (MIT)
- **Base UI** — https://base-ui.com + https://github.com/mui/base-ui (MIT)
- **Tremor** — https://tremor.so + https://github.com/tremorlabs/tremor (Apache 2.0)
- **Park UI** — https://park-ui.com + https://github.com/cschroeter/park-ui (MIT); built on [Ark UI](https://ark-ui.com) primitives with [Panda CSS](https://panda-css.com)
- **Magic UI** — https://magicui.design + https://github.com/magicuidesign/magicui (MIT); note Framer Motion runtime dependency (Open Q #6)

### Not adopted (reference only)
- [Pencil design libraries docs](https://docs.pencil.dev/core-concepts/design-libraries) — opaque `.lib.pen` model, closed-source
- Onlook's shadcn-first discovery pattern: [packages/ui/src/components](https://github.com/onlook-dev/onlook/tree/main/packages/ui/src/components)
