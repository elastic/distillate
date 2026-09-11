---
type: Reference
title: Glossary
description: Distillate vocabulary.
tags: [distillate, glossary]
status: stable
stale_after: 2027-03-11
generated: { by: anthropic/claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
sources:
  - id: engine
    resource: https://github.com/elastic/distillate/blob/main/src/engine.ts
    title: Distillery type
---

# Schema

| Term           | Meaning                                                                             |
| -------------- | ----------------------------------------------------------------------------------- |
| Distillery     | One library's binding: environment, registry, pre-bound operations.[^engine]        |
| Handle         | Named style entry. Carries `key`, `readableName`, declarations. Not a class string. |
| Artifact       | Tree-shaken CSS for HTML that leaves the app.                                       |
| Stylesheet     | Full CSS for every registered module.                                               |
| Readable names | `${module}-${path}`, `--${prefix}-...`.                                             |
| Compact names  | `a`, `b`, … from sorted collected keys.                                             |
| Variant        | Entry skipped by `use(module)` until `useHandles`.                                  |

Related: [the distillery](/concepts/distillery.md) and [public contract](/reference/public-contract.md).

[^engine]: Distillery type
