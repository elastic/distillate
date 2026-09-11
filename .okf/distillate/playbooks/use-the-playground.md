---
type: Playbook
title: Use the playground
description: Live Emotion and native authoring against a Borealis-flavored demo environment.
resource: https://github.com/elastic/distillate/blob/main/docs/playground/src/lib/demo_environment.ts
tags: [distillate, playground]
status: stable
stale_after: 2027-03-11
generated: { by: anthropic/claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
sources:
  - id: demo
    resource: https://github.com/elastic/distillate/blob/main/docs/playground/src/lib/demo_environment.ts
    title: Demo distillery and Borealis token values
  - id: snippets
    resource: https://github.com/elastic/distillate/blob/main/docs/playground/src/examples/snippets.ts
    title: Dual-mode playground examples
  - id: compile
    resource: https://github.com/elastic/distillate/blob/main/docs/playground/src/lib/compile.ts
    title: Playground compile, including artifact collection
  - id: docs
    resource: https://github.com/elastic/distillate/blob/main/docs/playground.md
    title: Playground user docs
---

# Steps

1. Open [elastic.github.io/distillate/playground](https://elastic.github.io/distillate/playground/) or run `pnpm playground:dev`.
2. Switch Emotion vs Native. Card, Buttons, Tree shake, Local vars, and Media + container ship in both modes; the selected example stays.[^snippets]
3. Interpolate `tokens.*` from the demo environment (`prefix: 'dstl'`, theme vars on `:host`). Brand colors are Borealis `primary`, `accent`, `accentSecondary`, `success`, `warning`, and `danger`.[^demo]
4. Read **Readable** / **Compact** as naming on the full stylesheet, and **Artifact** as the compact payload from handles the returned markup named. Byte counts stay visible without switching tabs.[^compile]
5. Treat chrome (`prefix: 'pg'`, theme vars on `:root`) as a second distillery. Snippet compilation does not share that registry.

The editor is Monaco with IntelliSense for the injected scope. Compile is sucrase then `new Function` — a demo, not a sandbox.

Related: [authoring](/concepts/authoring.md), [tokens and vars](/concepts/tokens.md), and [ship an artifact](/playbooks/ship-an-artifact.md).

[^demo]: Demo distillery and Borealis token values

[^snippets]: Dual-mode playground examples

[^compile]: Playground compile, including artifact collection
