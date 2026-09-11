---
type: Playbook
title: Migrate from Emotion
description: Adopt createEmotion without rewriting every call site.
tags: [distillate, playbook, emotion]
status: stable
stale_after: 2027-03-11
generated: { by: anthropic/claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
sources:
  - id: emotion
    resource: https://github.com/elastic/distillate/blob/main/src/emotion.ts
    title: createEmotion
---

# Steps

1. Bind a distillery ([bind a library](/playbooks/bind-a-library.md)).
2. `const { css, cx, injectGlobal } = createEmotion(distillery, { sink: createDomSink({ document }) })`.[^emotion]
3. Leave tagged templates in place. Replace `css({...})` with tagged templates.
4. Put runtime variation on CSS variables, not per-render template values.
5. Override by interpolating (`css\`${base} color: red;\``), not by relying on registration order.
6. New files can use `createStyleModule` on the same distillery; `cx` accepts native handles.

`String(css\`...\`)`is readable-only. Artifact collection needs`useHandles`. See [emotion entry](/entry-points/emotion.md).

[^emotion]: createEmotion
