---
navigation_title: Concepts
description: Distillery, tokens, authoring, collection, naming, and the single-copy invariant.
---

# Concepts

How Distillate turns tagged templates into CSS, in engine order: bind, author, collect, emit.

- [The distillery](distillery.md) — `createDistillery` and `DistilleryOptions`
- [Tokens and vars](tokens.md) — theme trees, `lightDark`, `cq`, `contextualVar`, `vars`
- [Authoring](authoring.md) — modules, handles, `css`, `rule`, `media`, `variants`
- [Reachability collection](collection.md) — `StylesCollector`
- [Naming and output](naming-and-output.md) — the four-way matrix
- [Ordering and specificity](ordering.md) — base rules before at-rules
- [Single-copy invariant](single-copy.md) — one loaded copy of the package

Named overlays are a guide: [Declare and select themes](../guides/theming.md).
