---
type: Entry Point
title: Emotion
description: '@elastic/distillate/emotion css / cx / injectGlobal over a distillery.'
resource: https://github.com/elastic/distillate/blob/main/src/emotion.ts
tags: [distillate, emotion, api]
status: stable
stale_after: 2027-03-11
generated: { by: anthropic/claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
sources:
  - id: emotion
    resource: https://github.com/elastic/distillate/blob/main/src/emotion.ts
    title: createEmotion
  - id: sink
    resource: https://github.com/elastic/distillate/blob/main/src/dom_sink.ts
    title: createDomSink
---

# Definition

`createEmotion(distillery, { sink? })` returns `css`, `cx`, `injectGlobal`, `stylesheet`, `globalModules`. `String(css\`...\`)`is the readable class and does not collect. The wrapper is still a`StyleHandle` for artifact collection.[^emotion]

`createDomSink({ document, parent?, schedule? })` manages one `<style>` element, rewritten on each invalidation, one flush per turn. It appends to `parent` (e.g. a `ShadowRoot`) or `document.head`. It is also exported from the [root entry](/entry-points/root.md) for `distillery.liveCollection({ sink })`.[^sink]

Object styles, `keyframes`, and `@container` inside `css` are rejected. Playbook: [migrate from Emotion](/playbooks/migrate-from-emotion.md).

[^emotion]: createEmotion

[^sink]: createDomSink
