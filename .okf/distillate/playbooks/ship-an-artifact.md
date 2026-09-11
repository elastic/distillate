---
type: Playbook
title: Ship an artifact
description: Collect handles during render and emit compact CSS.
tags: [distillate, playbook, artifact]
status: stable
stale_after: 2027-03-11
generated: { by: anthropic/claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
sources:
  - id: artifact
    resource: https://github.com/elastic/distillate/blob/main/docs/examples/02-artifact.ts
    title: Compact artifact example
  - id: payload
    resource: https://github.com/elastic/distillate/blob/main/docs/examples/06-payload.ts
    title: Stylesheet versus compact-artifact byte lengths
---

# Steps

1. `const collector = distillery.artifactCollector('compact')`.
2. Walk the view. For every handle you would apply, `collector.useHandles([...])`. Do not read compact names yet.
3. `const resolver = collector.createResolver()`.
4. Walk again. Write `resolver.className(handle.key, handle.readableName)` onto each element.
5. Inline `distillery.renderStyles(collector, resolver)` next to the HTML.[^artifact]

Compact names depend on the collected set and are not stable across renders. Variants must be named; `use(module)` skips them. `docs/examples/06-payload.ts` measures the full readable stylesheet against that compact artifact from one render.[^payload] See [naming and output](/concepts/naming.md).

[^artifact]: Compact artifact example

[^payload]: Stylesheet versus compact-artifact byte lengths
