---
type: Playbook
title: Distillate vs CSS-in-JS
description: When to use Distillate instead of Emotion, CSS Modules, static extraction, or Tailwind.
tags: [distillate, playbook, emotion, comparison]
status: stable
stale_after: 2027-03-11
generated: { by: claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
sources:
  - id: emotion
    resource: https://github.com/elastic/distillate/blob/main/src/emotion.ts
    title: createEmotion
  - id: instance
    resource: https://github.com/elastic/distillate/blob/main/src/instance.ts
    title: Single-copy guard
---

# Steps

This is a decision guide, not a migration procedure. For migration steps, see [migrate from Emotion](/playbooks/migrate-from-emotion.md).

**Use Distillate when:**

1. You ship a component library that exports both a readable stylesheet and compact self-contained CSS payloads (emails, AI cards, SVG, exported HTML).
2. You need typed token references (`lightDark`, `cq`, `t.vars`) with pruning — unused tokens drop from artifact CSS.
3. You want the same source to emit readable class names for development and short-identifier compact names for packaged artifacts.
4. You want test-time assertions that every `var(--...)` has a matching declaration (`assertVarRefsHaveDeclarations`).

**Do not use Distillate when:**

- You need per-render dynamic class names. Modules are static; put variation on CSS custom properties.
- You are styling an application directly (no artifact-export need). Emotion, CSS Modules, or Tailwind fit better.
- You rely on `styled.*`, keyframes, `@supports`, or object styles — these are unsupported.
- Your bundle cannot guarantee one physical copy at runtime. In plugin-host architectures (Kibana-style), the platform must expose Distillate as a shared dependency. See [single-copy invariant](/concepts/single-copy.md).

**vs static extraction (vanilla-extract / Linaria):** prefer vanilla-extract if build-time extraction is a hard requirement. Choose Distillate when artifact export or runtime reachability collection (CSS exactly matching a rendered tree) is required.[^emotion][^instance]

[^emotion]: createEmotion

[^instance]: Single-copy guard
