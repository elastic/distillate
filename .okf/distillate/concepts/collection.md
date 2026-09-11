---
type: Concept
title: Reachability collection
description: StylesCollector keeps the entries a render actually reached.
resource: https://github.com/elastic/distillate/blob/main/src/collector.ts
tags: [distillate, collector, reachability]
status: stable
stale_after: 2027-03-11
generated: { by: anthropic/claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
sources:
  - id: collector
    resource: https://github.com/elastic/distillate/blob/main/src/collector.ts
    title: StylesCollector
  - id: runtime
    resource: https://github.com/elastic/distillate/blob/main/src/runtime.ts
    title: renderStyles
  - id: distillery-tests
    resource: https://github.com/elastic/distillate/blob/main/src/distillery.test.ts
    title: Theme-var emission and default-narrowing tests
---

# Definition

Prefer `distillery.artifactCollector(names)` (empty) and `distillery.stylesheetCollector(names?)` (preloads every module via `useAllEntries`, default `'readable'`). There is no `StylesCollector.artifact` static factory.[^collector]

| Method                  | Effect                                                               |
| ----------------------- | -------------------------------------------------------------------- |
| `use(module)`           | Non-variant entries.                                                 |
| `useHandles(handles)`   | Named handles plus `auto` rules whose selector deps are all present. Media blocks keep only live inner rules. |
| `useAllEntries(module)` | Every entry, including variants.                                     |
| `useThemeVar(path)`     | Slash-delimited `themeVars` key, e.g. `colors/ink`.                  |

`renderThemeVars` emits every collected theme path (`useThemeVar`, interpolated tokens, surviving default-marker value deps). The body CSS is not consulted; a path can ship with no textual `var(...)` in the body. Named layers, media themes, and `{ alternates }` only change values and extra blocks for those paths.[^runtime][^distillery-tests]

`reachableDefaults(handle, groupPath)` prunes individual custom-property declarations inside a local-var default group to keys referenced by that handle or by a collected rule targeting it. Rule-level default markers have no host handle and emit every listed key.[^collector][^runtime]

Call `createResolver()` after collection is complete; compact names are assigned from the sorted collected key set.

[^collector]: StylesCollector

[^runtime]: renderStyles

[^distillery-tests]: Theme-var emission and default-narrowing tests
