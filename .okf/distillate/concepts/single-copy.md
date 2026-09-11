---
type: Concept
title: Single-copy invariant
description: Exactly one copy of Distillate may load at runtime.
resource: https://github.com/elastic/distillate/blob/main/src/instance.ts
tags: [distillate, bundling, invariants]
status: stable
stale_after: 2027-03-11
generated: { by: anthropic/claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
sources:
  - id: instance
    resource: https://github.com/elastic/distillate/blob/main/src/instance.ts
    title: Single-copy guard
---

# Definition

Module-scope caches (variant markers, dependent-entry maps, emotion per-registry state) mean two loaded copies break `variants(...)` tree-shaking and inflate CSS.[^instance]

On import, a random token is stored at `globalThis[Symbol.for('elastic.distillate.instance')]`. A later import with a different token `console.warn`s. It warns rather than throws. HMR and a fresh test registry also mint a new token.

`package.json` `sideEffects` lists `**/instance.ts` and `**/instance.js`. Consumers must externalize `@elastic/distillate`.

[^instance]: Single-copy guard
