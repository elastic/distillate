---
type: Concept
title: Authoring
description: Style modules, handles, templates, rules, media, and variants.
resource: https://github.com/elastic/distillate/blob/main/src/styles/authoring.ts
tags: [distillate, authoring, variants]
status: stable
stale_after: 2027-03-11
generated: { by: claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
sources:
  - id: styles
    resource: https://github.com/elastic/distillate/blob/main/src/styles/authoring.ts
    title: Authoring helpers
  - id: types
    resource: https://github.com/elastic/distillate/blob/main/src/styles/types.ts
    title: StyleHandle and module types
  - id: nesting
    resource: https://github.com/elastic/distillate/blob/main/src/nesting.ts
    title: stylis-backed nested templates
---

# Definition

A style module is a named group of entries produced by `createStyleModule`. The factory runs once; handles are static after construction. Runtime variation belongs on CSS custom properties.[^styles]

`t.css` / `css` builds a handle. Nested `&` and `@media` flatten into sibling rules via stylis `compile()`, pinned at 4.4.0.[^nesting] `rule`, `media`, and `container` are explicit factories. `@container` inside a `css` template is rejected.

`variants(keys, factory)` marks each value so `collector.use(module)` skips it. Name variant handles with `useHandles`.

# Examples

```ts
const demo = distillery.createStyleModule('demo', ({ css, tokens }) => ({
  root: css`
    color: ${tokens.colors.ink};
    &:hover { color: ${tokens.colors.accent}; }
  `,
}));
```

Related: [tokens and vars](/concepts/tokens.md), [reachability collection](/concepts/collection.md), [use the playground](/playbooks/use-the-playground.md).

[^styles]: Authoring helpers and StyleHandle

[^nesting]: stylis-backed nested templates
