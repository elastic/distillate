---
navigation_title: Declare and select themes
description: Named overlays, render-time selection, and alternate selector blocks.
---

# Declare and select themes

Declaring a theme says what its values are. Selecting one says which blocks a given render emits. Distillate keeps those apart so unused themes cost nothing.

## Declare

Named layers are partial overlays of the base `theme`. They cannot introduce new paths. `ScaleToken` leaves must match the base because they inline at authoring time.

```ts
const distillery = createDistillery({
  prefix: 'eui',
  themeScope: '.eui-view',
  theme: {
    colors: {
      ink: lightDark('#111', '#eee'),
      accent: lightDark('#06c', '#8cf'),
    },
  },
  themes: {
    amsterdam: {
      colors: { accent: '#0077cc' }, // overlay; flatten with { theme: 'amsterdam' }
    },
    highContrast: {
      media: '(prefers-contrast: more)', // intrinsic; diffs wrap in @media
      tokens: {
        colors: { ink: lightDark('#000', '#fff') },
      },
    },
  },
});
```

A selector is the consuming page's DOM contract, so it is supplied per render rather than on the layer.

## Select

Base only is the default, and byte-for-byte what a distillery without `themes` emits:

```ts
distillery.renderStyles(collector);
```

Flatten one non-media theme into `themeScope`. Same declaration count as the base; values change:

```ts
distillery.renderStyles(collector, undefined, { theme: 'amsterdam' });
```

Runtime switching: the base fills `themeScope`, each alternate emits only its diff:

```ts
distillery.renderStyles(collector, undefined, {
  alternates: [
    { theme: 'amsterdam', selector: '[data-eui-theme="amsterdam"]' }, // diff under this selector
  ],
});
```

`:host` composes as `:host(selector)`. Media layers may omit `selector`; the diffs wrap in `@media`.

`themeValueOverrides` still apply per render for values known only at request time. Declared themes are for values known when the distillery is created.
