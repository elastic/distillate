---
navigation_title: Authoring
description: Style modules, handles, nested templates, rules, media, and variants.
---

# Authoring

A style module is a named group of entries. The factory runs once; the returned handles are static. The bind matches [quick start](../getting-started/quick-start.md).

```ts
import {
  createDistillery,
  cq,
  lightDark,
  rule,
  variants,
} from '@elastic/distillate';

const distillery = createDistillery({
  prefix: 'eui',
  themeScope: '.eui-view',
  theme: {
    colors: {
      ink: lightDark('#111', '#eee'),
      accent: lightDark('#06c', '#8cf'),
      surface: lightDark('#fff', '#000'),
    },
    gap: cq('8px', '2cqi'),
  },
});

const callout = distillery.createStyleModule('callout', ({ css, decls, tokens }) => ({
  root: css`
    padding: ${tokens.gap};
    color: ${tokens.colors.ink};
    &:hover {
      color: ${tokens.colors.accent};
    }
    @media (min-width: 600px) {
      padding: 16px;
    }
  `, <1>
  title: css`
    font-weight: 600;
  `,
  tone: variants(
    ['calm', 'loud'] as const,
    (tone) =>
      css`
        outline-color: ${tone === 'calm' ? tokens.colors.surface : tokens.colors.accent};
      `
  ), <2>
  hoverTitle: rule(
    (h) => `${h.root}:hover ${h.title}`,
    decls`
      color: ${tokens.colors.accent};
    `
  ), <3>
}));
```

1. Nested `&:hover` and `@media` stay on this handle and collect with it.
2. Variant keys. `collector.use(callout)` skips these until you name `tone.loud`.
3. Combines two handles. Auto-collects only when both `root` and `title` are live.

What you get back is not a class name. A **handle** carries a `key`, a `readableName`, and the declarations the collector needs. The same handle can emit `.callout-root` or `.a` depending on the resolver.

## Templates

| Helper                            | Role                                                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `css`                             | Handle. Nested `&` and `@media` flatten into sibling rules. Also a top-level export.                                 |
| `decls`                           | Declaration block for `rule(...)`. Also a top-level export.                                                          |
| `rule(selector, decls, options?)` | Selector plus declarations. `auto` (default `true`) self-collects when every handle the selector reads is collected. |
| `media(query, rules)`             | `@media` block.                                                                                                      |
| `container(query, rules)`         | `@container` block. Same collector rank as `media`.                                                                  |
| `variants(keys, factory)`         | One entry per key, marked `variant` so `collector.use(module)` skips it.                                             |
| `mapDomain(keys, factory)`        | Same mapping as `variants`, with no collector side effect. Use it on non-CSS surfaces.                               |

`@container` inside a `css` template is rejected; use the `container(...)` factory. `@supports` and `keyframes` are not supported. Object styles (`css({ color: 'red' })`) are not supported on the emotion entry.

### When to reach for each helper

**`css` with nesting** is the default. Nested `&` and `@media` blocks inside `css` are all part of that handle — they collect together and share its class name.

**`rule`** is for selectors that combine two handles (`${h.root}:hover ${h.title}`). The key behaviour: `rule` records every handle the selector reads as a dependency, and only auto-collects when all of them are live. Use `{ auto: false }` to require an explicit `collector.use(ruleEntry)` instead of piggybacking on dependency collection.

**`media` / `container`** as explicit factories wrap multiple handles in one block and collect independently. Prefer nesting `@media` inside `css` when a block is local to one handle. Reach for `media(...)` when the block spans multiple entries or needs to be toggled separately from them. The `container(...)` factory is always required for `@container` — it cannot be nested inside `css`.

## Static after construction

Anything that varies at runtime belongs on a CSS custom property (`vars`, theme tokens), not on a new template per render. Immutable modules are what makes dependency capture and reachability cheap.

## Variants

`collector.use(callout)` does not collect `callout.handles.tone.loud`. Name the variant you rendered:

```ts
const collector = distillery.artifactCollector('compact');
collector.useHandles([callout.handles.root, callout.handles.tone.loud]);
```

`stylesheetCollector()` includes every variant because it calls `useAllEntries`.

## Selector rules

`hoverTitle` above records `root` and `title` as dependencies. Auto-collection fires only when every dependency is already collected — a `button + other` rule stays out until both handles are in.

```ts
rule((h) => `${h.button}:hover`, decls`color: red;`, { auto: false }); // requires collector.use(ruleEntry)
```

## Combining class names

`combineClassNames(context, ...handles)` forwards to `context.resolveClassName`. In a React renderer, that context is the collector-backed resolver you pass down the tree. See [Integrate with a React renderer](../guides/react-renderer.md).
