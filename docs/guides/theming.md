---
navigation_title: Declare and select variations
description: Named variations, render-time flatten and alternates, and when not to use a variation.
---

# Declare and select variations

`theme` is the default tree you ship. If you only ship one brand, that brand is `theme`, not a variation.

`variations` are named, value-only diffs of that same tree. Declaring one does not emit it. Name it at `renderStyles` with `{ flatten }` or `{ alternates }` so unused variations cost nothing.

## Declare

Named variations cannot introduce new paths. They do not chain: each is resolved against the base, not against another variation. `media` is the query only (`'(prefers-contrast: more)'`), not `@media (...)`.

```ts
const distillery = createDistillery({
  prefix: 'eui',
  themeScope: '.eui-view',
  theme: {
    colors: {
      ink: lightDark('#111', '#eee'),
      accent: lightDark('#06c', '#8cf'),
    },
    gap: cq('8px', '2cqi'),
  },
  variations: {
    muted: {
      colors: { accent: '#0077cc' }, // flatten with { flatten: 'muted' }
    },
    highContrast: {
      media: '(prefers-contrast: more)',
      variation: {
        colors: { ink: lightDark('#000', '#fff') },
      },
    },
  },
});
```

A selector is the consuming page's DOM contract, so it is supplied per render rather than on the variation.

`cq()` / `ScaleToken` leaves inline at authoring time and cannot change in a variation. Spacing authored with `cq('8px', '2cqi')` is fixed; a `dense` variation that tried to swap `cq('4px', '1cqi')` throws. Making density selectable means authoring that size as a string leaf so it becomes a theme var, and giving up inlining.

## Select

Base only is the default, and byte-for-byte what a distillery without `variations` emits:

```ts
distillery.renderStyles(collector);
```

Flatten one non-media variation into `themeScope`. Same declaration count as the base; values change:

```ts
distillery.renderStyles(collector, undefined, { flatten: 'muted' });
```

`{ scheme: 'light' | 'dark' }` is the same idea for the built-in color scheme: emit one side's literal instead of `light-dark(...)`. It applies to every emitted block, including `alternates`. See [read values outside CSS](non-css-surfaces.md).

```ts
distillery.renderStyles(collector, undefined, { scheme: 'light' });
```

Runtime switching: the base fills `themeScope`, each alternate emits only its diff:

```ts
distillery.renderStyles(collector, undefined, {
  alternates: [
    { variation: 'muted', selector: '[data-eui-theme="muted"]' },
  ],
});
```

Independent paths compose through the cascade. Flatten `muted` and list `highContrast` as an alternate:

```ts
distillery.renderStyles(collector, undefined, {
  flatten: 'muted',
  alternates: [{ variation: 'highContrast' }],
});
```

That writes muted values into `themeScope`, then the high-contrast diff (computed against the base, not against muted) inside `@media (prefers-contrast: more)`. Colliding paths do not merge: the media block's value wins inside the query. A combined variation is only needed if the high-contrast values themselves depend on which flattenable variation is selected.

`:host` composes as `:host(selector)`. Media variations may omit `selector`; the diffs wrap in `@media`. Flattening a media variation does **not** replace the primary block: the base still fills `themeScope`, and the diffs wrap in `@media`. That is byte-identical to listing the same name in `alternates`.

`themeValueOverrides` still apply per render for values known only at request time. They win over both `flatten` and `scheme`. Declared variations are for values known when the distillery is created. A non-CSS consumer that needs those declared values calls `distillery.resolveValues(scheme, variation?)`; that walk does not apply `themeValueOverrides`. A CSS-consuming surface that cannot resolve `light-dark()` uses `renderStyles({ scheme })` instead. See [read values outside CSS](non-css-surfaces.md).

## What a variation cannot do

A variation changes values for token paths that are already collected. It never changes which declarations exist. A structural response to `prefers-contrast` — replacing `box-shadow` with a border, hiding a decorative rule — belongs in the module via [`media()`](../concepts/authoring.md):

```ts
media('(prefers-contrast: more)', [
  rule(
    (h) => h.root,
    decls`box-shadow: none; border: 1px solid ${tokens.colors.ink};`
  ),
]);
```

## When not to use a variation

Anything that can diverge structurally over time — a second brand, a second product — is a second distillery with its own base tree. One distillery per library keeps registries private; see [the distillery](../concepts/distillery.md).

The engine will not stop you from growing `theme` with paths that exist only so one variation can touch them. That is token feature-flagging. If a difference needs new paths or different leaf kinds, it is not a variation.
