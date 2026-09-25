---
type: Entry Point
title: Root
description: '@elastic/distillate engine, authoring, tokens, collector, and renderer.'
resource: https://github.com/elastic/distillate/blob/main/src/index.ts
tags: [distillate, api]
status: stable
stale_after: 2027-03-11
generated: { by: anthropic/claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
sources:
  - id: barrel
    resource: https://github.com/elastic/distillate/blob/main/src/index.ts
    title: Root barrel
  - id: smoke
    resource: https://github.com/elastic/distillate/blob/main/scripts/smoke_exports.js
    title: Package export smoke check
---

# Definition

The default export map. Notable symbols: `createDistillery`, `cssVarName`, `lightDark`, `cq`, `zipSchemes`, `resolveThemeValues`, `themeToken`, `scaleToken`, `contextualVar`, `css`, `decls`, `rule`, `media`, `container`, `variants`, `mapDomain`, `combineClassNames`, `StylesCollector`, `renderStyles`, `createStyleNameResolver`, `createDomSink`. Live-render types: `LiveCollection`, `LiveCollectionOptions`, `StyleSink`, `StyleParentLike`. Render selection types: `RenderStylesOptions`, `ThemeAlternate`, `ThemeVariation`. Value-tree types: `TokensOf`, `ValuesOf`.[^barrel]

`createDomSink` and its types are exported here and from [emotion](/entry-points/emotion.md), so a host without Emotion can attach a sink to a live collection.[^smoke]

This entry reaches `stylis`. Sibling: [emotion](/entry-points/emotion.md), [testing](/entry-points/testing.md).

[^barrel]: Root barrel

[^smoke]: Package export smoke check
