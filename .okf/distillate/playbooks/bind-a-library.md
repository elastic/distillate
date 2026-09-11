---
type: Playbook
title: Bind a library
description: Supply prefix and a theme tree to createDistillery.
tags: [distillate, playbook]
status: stable
stale_after: 2027-03-11
generated: { by: anthropic/claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
sources:
  - id: fixture
    resource: https://github.com/elastic/distillate/blob/main/docs/examples/fixture.ts
    title: Example environment fixture
---

# Steps

1. Author a `theme` tree with `lightDark`, strings, and `cq` / `scaleToken`. Optional `themes` are partial overlays; they do not emit until named at `renderStyles`.
2. Call `createDistillery` with `prefix`, `themeScope`, `theme`, and optional `sharedVars` / `themes`.[^fixture]
3. Author modules with `createStyleModule`. Interpolate `tokens`.
4. Emit `stylesheetCollector()` for an app sheet, or `artifactCollector('compact')` for a payload.

`prefix` must be a CSS identifier segment. One distillery per library so registries stay private. See [the distillery](/concepts/distillery.md).

[^fixture]: Example environment fixture
