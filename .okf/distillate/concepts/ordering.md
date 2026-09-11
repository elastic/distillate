---
type: Concept
title: Ordering
description: Base rules emit before every media and container block.
resource: https://github.com/elastic/distillate/blob/main/src/collector.ts
tags: [distillate, css, ordering]
status: stable
stale_after: 2027-03-11
generated: { by: anthropic/claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
sources:
  - id: collector
    resource: https://github.com/elastic/distillate/blob/main/src/collector.ts
    title: Emission order for media, containers, and local-var overlays
  - id: tests
    resource: https://github.com/elastic/distillate/blob/main/src/distillery.test.ts
    title: Media, container, and local-var overlay emission-order tests
---

# Definition

`@media` and `@container` add no specificity. Distillate emits every non-conditional entry first, then every conditional block, globally — not per module — so a same-selector override wins by source order.[^collector][^tests]

`container(...)` keeps `kind: 'media'` to share that rank. `${group.set()}` overrides emit after `${group}` defaults so a stacked modifier class wins.[^collector] Independent emotion `css` calls have no guaranteed order; compose by interpolation.

Related: [authoring](/concepts/authoring.md) and [naming and output](/concepts/naming.md).

[^collector]: Emission order for media, containers, and local-var overlays

[^tests]: Media, container, and local-var overlay emission-order tests
