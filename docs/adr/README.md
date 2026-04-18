# Architecture Decision Records

Load-bearing decisions that govern how OpenCanvas is built. Each ADR describes the context, the decision, and the consequences at the time it was made. Later realities go into an **Addendum** at the bottom of the same file; the original body is not rewritten — the history of how the decision aged is part of the record.

When a decision is genuinely reversed, write a new ADR that supersedes the old one and link both ways.

## Index

| # | Title | Status |
|---|-------|--------|
| [0001](./0001-frontend-ui-stack.md) | Frontend UI stack for the editor shell | Accepted (2026-04-18) |
| [0002](./0002-inspector-information-architecture.md) | Inspector information architecture | Proposed (2026-04-18) |

## Adding a new ADR

1. Copy the shape of an existing file (Status / Date / Owner / Related / Context / Decision / Consequences / Open questions).
2. Start with **Status: Proposed**. Flip to **Accepted** once code starts landing against it.
3. If an accepted ADR's reality diverges from the original text, append an **Addendum** section dated, signed, and describing what changed — don't rewrite the body.
4. Reference the ADR from [`CONTRIBUTING.md`](../../CONTRIBUTING.md) if it shapes contributor expectations.
