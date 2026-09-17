---
type: Playbook
title: Read theme values
description: Resolve nested literal theme values for surfaces that cannot use CSS custom properties.
tags: [distillate, playbook, theme]
status: stable
stale_after: 2027-03-16
generated: { by: xai/grok-4.6, at: 2026-09-17T02:22:00Z }
sources:
  - id: theme
    resource: https://github.com/elastic/distillate/blob/main/src/theme.ts
    title: resolveThemeValues and ValuesOf
  - id: engine
    resource: https://github.com/elastic/distillate/blob/main/src/engine.ts
    title: Distillery.resolveValues
  - id: authoring
    resource: https://github.com/elastic/distillate/blob/main/src/styles/authoring.ts
    title: mapDomain and variants
  - id: guide
    resource: https://github.com/elastic/distillate/blob/main/docs/guides/non-css-surfaces.md
    title: Read values outside CSS
---

# Steps

1. Author the usual `theme` tree (`lightDark`, strings, `cq`). Bind with `createDistillery`.
2. Call `distillery.resolveValues('light' | 'dark', variation?)` for a nested literal tree. `ScaleToken` leaves are `.value`; other leaves are the scheme side of `themeVars`. Pass a declared variation name to apply its diffs.
3. On a non-CSS surface, map enums with `mapDomain` instead of rewriting `variants`.[^theme][^engine][^authoring]

The engine does not strip units. Related: [tokens and vars](/concepts/tokens.md), [the distillery](/concepts/distillery.md).[^guide]

[^theme]: resolveThemeValues and ValuesOf

[^engine]: Distillery.resolveValues

[^authoring]: mapDomain and variants

[^guide]: Read values outside CSS
