---
navigation_title: Read values outside CSS
description: Resolve the theme tree to literal strings for surfaces that cannot use CSS custom properties.
---

# Read values outside CSS

`tokens` stringify to `var(--x)`. That is the right shape for CSS. A headless SVG or PNG rasterizer has no custom-property engine, so it needs the nested literal strings `createDistillery` already computed.

`resolveValues(scheme, variation?)` walks the original theme tree: `lightDark` and string leaves come from `themeVars` for that scheme, `cq` / `ScaleToken` leaves become `.value`. Named variations apply the same diffs `renderStyles({ flatten })` would. Resolution is lazy; unused variations are not precomputed.

```ts
import { createDistillery, cq, lightDark, mapDomain } from '@elastic/distillate';

const theme = {
  colors: {
    ink: lightDark('#111', '#eee'),
    accent: lightDark('#06c', '#8cf'),
  },
  type: {
    size: {
      s: '12px',
      m: '16px',
    },
  },
  gap: cq('8px', '2cqi'),
} as const;

const distillery = createDistillery({
  prefix: 'eui',
  themeScope: '.eui-view',
  theme,
  variations: {
    muted: { colors: { accent: '#0077cc' } },
  },
});

const light = distillery.resolveValues('light');
light.colors.ink; // '#111'
light.type.size.m; // '16px'
light.gap; // '8px'

const mutedDark = distillery.resolveValues('dark', 'muted');
mutedDark.colors.accent; // '#0077cc'
```

`resolveThemeValues(theme, themeVars, scheme, variation?)` is the same walk when you already have the tree and registry and do not want to go through the distillery.

The engine does not strip units. `'16px'` stays `'16px'`; a renderer that wants a number parses the string. `.cq` stays on the `ScaleToken` in `theme` / `tokens` if the surface needs the container-relative form.

`mapDomain` is the non-CSS half of `variants()`: map an enum to a value with no collector side effect. `variants()` calls it, then marks each value so `collector.use(module)` skips it.

```ts
const sizes = ['s', 'm'] as const;
const typeSize = mapDomain(sizes, (size) => light.type.size[size]);
```
