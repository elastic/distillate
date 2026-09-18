---
navigation_title: Read values outside CSS
description: Resolve theme literals, or emit a stylesheet with one scheme already chosen, for surfaces that cannot use CSS custom properties or `light-dark()`.
---

# Read values outside CSS

`tokens` stringify to `var(--x)`. That is the right shape for CSS. A headless SVG or PNG rasterizer has no custom-property engine, so it needs the nested literal strings `createDistillery` already computed. A target that consumes the stylesheet itself but has no color scheme to resolve `light-dark()` against — an image or PDF backend, email HTML, an older browser — needs the same values written into the theme block.

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

## Emit a single-scheme stylesheet

When the consumer still wants CSS — the React tree plus the emitted sheet — pass `{ scheme: 'light' | 'dark' }` to `renderStyles`. Differing `lightDark` leaves emit that scheme's literal instead of `light-dark(...)`.

```ts
distillery.renderStyles(collector, undefined, { scheme: 'light' });
// --eui-colors-ink:#111  (not light-dark(#111,#eee))

distillery.renderStyles(collector, undefined, {
  scheme: 'light',
  flatten: 'muted',
});
// --eui-colors-accent:#0077cc  (the variation, not the base)
```

`scheme` reads the `ThemeVarDefinition` each var-block already selected, so it composes with `{ flatten }` and `{ alternates }`. `themeValueOverrides` still wins. A variation that differs from the base only on the unselected side still emits its diff; under `scheme` that declaration can equal the primary block. Combining `scheme` with `alternates` is allowed: `scheme` describes the target, not the content.

`resolveThemeValues(theme, themeVars, scheme, variation?)` is the same walk when you already have the tree and registry and do not want to go through the distillery.

The engine does not strip units. `'16px'` stays `'16px'`; a renderer that wants a number parses the string. `.cq` stays on the `ScaleToken` in `theme` / `tokens` if the surface needs the container-relative form.

`mapDomain` is the non-CSS half of `variants()`: map an enum to a value with no collector side effect. `variants()` calls it, then marks each value so `collector.use(module)` skips it.

```ts
const sizes = ['s', 'm'] as const;
const typeSize = mapDomain(sizes, (size) => light.type.size[size]);
```
