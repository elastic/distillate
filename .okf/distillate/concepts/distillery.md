---
type: Concept
title: The distillery
description: Bind prefix and a theme tree with createDistillery.
resource: https://github.com/elastic/distillate/blob/main/src/engine.ts
tags: [distillate, engine, environment]
status: stable
stale_after: 2027-03-11
generated: { by: claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
sources:
  - id: engine
    resource: https://github.com/elastic/distillate/blob/main/src/engine.ts
    title: createDistillery implementation
  - id: environment
    resource: https://github.com/elastic/distillate/blob/main/src/environment.ts
    title: DistilleryOptions and DistilleryEnvironment
  - id: theme
    resource: https://github.com/elastic/distillate/blob/main/src/theme.ts
    title: Theme derivation
  - id: runtime
    resource: https://github.com/elastic/distillate/blob/main/src/runtime.ts
    title: renderStyles theme selection
---

# Definition

`createDistillery(options)` returns a destructure-safe `Distillery`: `environment`, `tokens`, `themeVars`, `registry`, `createStyleModule`, `primitiveStyles`, `artifactCollector`, `stylesheetCollector`, `renderStyles`, `createNameResolver`. Each call owns a private `StyleRegistry`. `environment` is the resolved form (derived `themeVars` and `tokens`).[^engine]

# Schema

| Field        | Required | Notes                                                                                         |
| ------------ | -------- | --------------------------------------------------------------------------------------------- |
| `prefix`     | yes      | CSS identifier segment.                                                                        |
| `themeScope` | yes      | Selector wrapping the theme-variable block.                                                 |
| `theme`      | yes      | Nested value tree. Strings and `lightDark` become theme vars; `cq` / `scaleToken` inline.   |
| `themes`     | no       | Named overlays of `theme`. Declaring a theme does not emit it; name it at `renderStyles`.        |
| `sharedVars` | no       | Cross-module contextual-var paths. Names derive via `cssVarName`.                            |

Theme-tree keys must match `/^[A-Za-z_][A-Za-z0-9_]*$/`. `themeVars` and `sharedVars` that hyphenate to the same readable custom-property name throw at construction. `lightDark` values that are not CSS `<color>` throw. Named `themes` overlays that introduce unknown paths or disagree on leaf kind throw. `renderStyles` selects a declared theme with `{ theme }` or `{ alternates }`.[^environment][^theme][^runtime]

# Examples

See [bind a library](/playbooks/bind-a-library.md).

[^engine]: createDistillery implementation

[^environment]: DistilleryOptions and DistilleryEnvironment

[^theme]: Theme derivation

[^runtime]: renderStyles theme selection
