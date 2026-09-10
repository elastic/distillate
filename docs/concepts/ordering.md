---
navigation_title: Ordering and specificity
description: Base rules emit before every media and container block.
---

# Ordering and specificity

`@media` and `@container` add no specificity. When a base rule and a conditional override target the same selector, **source order** decides the winner. Distillate therefore emits every non-conditional entry first, then every `@media` / `@container` block, globally — not per module.

To override a base declaration at a breakpoint, put the override in `media(...)` or `container(...)` (or nest `@media` inside `css`). Do not rely on module registration order.

```ts
import {
  createDistillery,
  media,
  rule,
} from '@elastic/distillate';

const distillery = createDistillery({
  prefix: 'eui',
  themeScope: '.eui-view',
  theme: {},
});

distillery.createStyleModule('zebra', ({ css, decls }) => ({
  root: css`
    grid-template-columns: repeat(4, 1fr);
  `,
  responsive: media('(max-width: 620px)', [
    rule(
      (selectors) => `${selectors.root}`,
      decls`
        grid-template-columns: 1fr;
      `
    ),
  ]),
}));

distillery.renderStyles(distillery.stylesheetCollector());
```

```css
.zebra-root {
  grid-template-columns: repeat(4, 1fr);
}
@media (max-width: 620px) {
  .zebra-root {
    grid-template-columns: 1fr;
  }
}
```

`container(...)` keeps `kind: 'media'` so it shares that rank. Nested `@media` inside `css` flattens to the same at-rule bucket.

## Local var overlays

`${group}` defaults and `${group.set()}` overrides have equal specificity when both classes are on the same element. Distillate emits every non-override entry first, then every `.set()` override, globally — not per handle name — so the stacked modifier wins.

## Emotion composition

Independent `css` calls have no guaranteed order relative to each other. `cx(a, b)` only joins class names; it does not order the stylesheet. To override, interpolate (`css\`${base} color: red;\``). The composed declarations re-target the composing class in source order (last wins).
