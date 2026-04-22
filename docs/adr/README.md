# Architecture Decision Records

Load-bearing decisions that govern how DesignJS is built. Each ADR describes the context, the decision, and the consequences at the time it was made. Later realities go into an **Addendum** at the bottom of the same file; the original body is not rewritten — the history of how the decision aged is part of the record.

When a decision is genuinely reversed, write a new ADR that supersedes the old one and link both ways.

## Index

The **Implementation** column lists the commit(s) that landed each ADR. For ADRs with long implementation chains, only the load-bearing commits are listed inline; the full set lives in each ADR's *Addendum* section.

| # | Title | Status | Implementation |
|---|-------|--------|----------------|
| [0001](./0001-frontend-ui-stack.md) | Frontend UI stack for the editor shell | Accepted (2026-04-18) | Phase A — `81930a1`, `b56957a`, `3f0bda7`, `f8fc6d5`. Phase D.4d.2 icon-stack amendment — `b6e6fa5`. See [Addenda](./0001-frontend-ui-stack.md#addendum--2026-04-18-phase-a-implementation-status--deferred-pieces). |
| [0002](./0002-inspector-information-architecture.md) | Inspector information architecture | **Superseded by [ADR-0003](./0003-panel-information-architecture.md)** (2026-04-18) | n/a — never independently implemented; subsumed into ADR-0003. Core principles (semantic layer over GrapesJS, escape-hatch, selection-gated visibility) carried forward. |
| [0003](./0003-panel-information-architecture.md) | Panel information architecture — Penpot as the reference shape | Accepted (2026-04-18); §"Left panel" item 2 superseded by [ADR-0004](./0004-frames-in-layer-tree.md) | Phase D.3-D.7 — `8c18c04` (single-view panels), `269db21` (Layer + Layout Item), `87a4b54` (Fill / Stroke / Shadow wired), `15cf4c9` (Typography + Exports), `e9fa5aa` (Effects), `b86cfa4` (status sync). Full chain in [Addendum](./0003-panel-information-architecture.md#addendum--2026-04-18-late-implementation-status). |
| [0004](./0004-frames-in-layer-tree.md) | Frames as top-level nodes inside the layer tree | Accepted (2026-04-18) | `61c1723` (impl), `b5fa664` (status flip + addendum). |
| [0005](./0005-html-primitives-mapping.md) | HTML primitives ↔ design-tool shape concepts | Accepted (2026-04-19) | `df7e87b` (primitives module), `a357bd3` (LayersPanel), `f6b7541` (InsertRail), `8d02b6e` (E2E), `d391bd7` (status flip + addendum). |
| [0006](./0006-sizing-auto-layout-canvas-model.md) | Sizing modes, auto-layout taxonomy, canvas model, and the Raw CSS exit path | Proposed (2026-04-19) | — |
| [0007](./0007-user-extensibility.md) | Block data model, built-in UI kits, and user-extensibility | Proposed (2026-04-22) | — |

## Adding a new ADR

1. Copy the shape of an existing file (Status / Date / Owner / Related / Context / Decision / Consequences / Open questions).
2. Start with **Status: Proposed**. Flip to **Accepted** once code starts landing against it.
3. **Add an Implementation entry to the Index above** when the first commit lands. Update the entry as more commits ship; if the chain gets long, fold the long-tail into the ADR's Addendum and keep only load-bearing hashes in the Index row.
4. If an accepted ADR's reality diverges from the original text, append an **Addendum** section dated, signed, and describing what changed — don't rewrite the body.
5. If a decision is genuinely reversed, write a new ADR that supersedes the old one. Link both ways: the new ADR's `Supersedes` block, and the old ADR's `Status` updated to `Superseded by ADR-NNNN`.
6. Reference the ADR from [`CONTRIBUTING.md`](../../CONTRIBUTING.md) if it shapes contributor expectations.

## Why ADRs aren't moved or archived

ADRs are an immutable historical record. Moving an Accepted ADR into a `completed/` subdirectory would break commit-message cross-references (e.g. `commit b5fa664` references `0004-frames-in-layer-tree.md` at its current path), in-ADR cross-links (`Supersedes` / `Related` blocks), and the convention that an ADR's path is its permanent ID. ADRs don't "complete" the way stories do — the *implementation* completes; the ADR records the decision. The Index above is the index of "where each one is in its lifecycle."
