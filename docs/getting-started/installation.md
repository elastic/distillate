---
navigation_title: Installation
description: Add Distillate to a project.
---

# Installation

```sh
npm install @elastic/distillate
```

pnpm and yarn work the same way. The package is ESM-only (`"type": "module"`) and declares `engines.node` `>=20`.

## Entry points

| Specifier                     | Use                                              |
| ----------------------------- | ------------------------------------------------ |
| `@elastic/distillate`         | Engine, authoring, tokens, collector, renderer.  |
| `@elastic/distillate/emotion` | `createEmotion`, `createDomSink`.                |
| `@elastic/distillate/testing` | Var-invariant helpers. Does not import `stylis`. |

The root and emotion entries both reach `stylis@4.4.0`. Do not hoist a different stylis version; nested templates walk a pinned `compile()` tree shape.

## Bundlers

Exactly one copy of `@elastic/distillate` may load. Two copies break `variants(...)` tree-shaking. Library builds should list it as an external; apps should dedupe to the project-root install. Vite, Rollup, and webpack snippets: [single-copy invariant](../concepts/single-copy.md).
