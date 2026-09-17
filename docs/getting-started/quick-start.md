---
navigation_title: Quick start
description: Bind an environment, author a module, and emit CSS.
---

# Quick start

Three calls cover the happy path: bind, author, emit.

## Bind

```ts
import { createDistillery, cq, lightDark } from '@elastic/distillate';

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
```

`prefix` must be a CSS identifier segment. `themeScope` is the selector that wraps emitted theme-variable declarations. Theme-tree keys match `/^[A-Za-z_][A-Za-z0-9_]*$/`. Strings and `lightDark` leaves become theme vars named `cssVarName(prefix, path)`; `cq` / `scaleToken` leaves inline. Differing `lightDark` values fold into `light-dark(...)`.

## Author

```ts
const demo = distillery.createStyleModule('demo', ({ css, tokens }) => ({
  root: css`
    color: ${tokens.colors.ink}; <1>
    padding: ${tokens.gap}; <2>
  `,
}));
```

1. Theme token: records a dependency, emits `var(--eui-colors-ink)`.
2. Scale token: inlines `8px`.

## Emit

A full readable stylesheet:

```ts
distillery.renderStyles(distillery.stylesheetCollector()); // readable: .demo-root, --eui-colors-ink
```

A compact artifact that includes only `demo.handles.root`:

```ts
const collector = distillery.artifactCollector('compact');
collector.use(demo.handles.root); // unused handles and tokens drop out
distillery.renderStyles(collector); // compact: .a, --a
```

Those outputs are asserted in [`docs/examples/`](https://github.com/elastic/distillate/tree/main/docs/examples). Next: [your first stylesheet](your-first-stylesheet.md), [declare and select variations](../guides/theming.md), or skip to [naming and output](../concepts/naming-and-output.md).
