---
navigation_title: Tokens and vars
description: Theme trees, lightDark, cq, contextualVar, and module-local vars groups.
---

# Tokens and vars

Author a nested value tree. `createDistillery` derives `CssToken` / `ScaleToken` leaves and the `themeVars` registry. Branded values stringify through `Symbol.toPrimitive`, which is why they interpolate into tagged templates.

## Theme tokens

```ts
const distillery = createDistillery({
  prefix: 'eui',
  themeScope: '.eui-view',
  theme: {
    colors: {
      ink: lightDark('#111', '#eee'),
      warning: '#FACB3D',
    },
  },
});
const { ink } = distillery.tokens.colors;
String(ink); <1>
ink.cssVar; <2>
ink.path; <3>
```

1. Interpolates as `var(--eui-colors-ink)`. This is what tagged templates splice in.
2. Custom-property name: `--eui-colors-ink`.
3. Slash path matching `themeVars` keys: `colors/ink`.

A string leaf is scheme-invariant (`light === dark`). `lightDark(light, dark)` is scheme-varying and both sides must be CSS `<color>` values. Emission uses `light-dark(light, dark)` when the two values differ. Unread theme tokens are pruned from the theme block.

`zipSchemes(light, dark)` folds two per-scheme trees into this form: equal strings stay bare, differing strings become `lightDark`, and `ScaleToken` leaves must agree.

Named variations go on `variations` in `createDistillery`. Declaring a variation does not emit it; name it at `renderStyles` with `{ flatten }` or `{ alternates }`. Variations extend the base only. `ScaleToken` leaves must match the base because they inline and cannot vary. See [declare and select variations](../guides/theming.md).

`themeToken(path, cssVar)` remains the constructor derivation calls. Paths are slash-delimited (`colors/ink`), matching `themeVars` keys.

The `chip` module below uses `tokens.colors.surface` from the [quick start](../getting-started/quick-start.md) token tree.

## Scale tokens

```ts
const gap = cq('8px', '2cqi');
String(gap); <1>
gap.cq; <2>
```

1. Inlines as `8px`. No custom property, nothing to prune.
2. Container-relative value: `2cqi`. Use this when the declaration should track container size.

`cq` is an alias of `scaleToken`.

## Shared contextual vars

```ts
const foreground = contextualVar(
  'vars/app/tone/foreground',
  '--eui-app-tone-foreground'
);
String(foreground); <1>
String(foreground.name); <2>
```

1. Interpolating the var **reads** it: `var(--eui-app-tone-foreground)`.
2. Writing `.name` **declares** the property: `--eui-app-tone-foreground`.

Register the path in `sharedVars` so two modules can share the name without either owning it.

## Module-local `vars`

```ts
const chip = distillery.createStyleModule('chip', ({ css, tokens, vars }) => {
  const look = vars('look', {
    bg: tokens.colors.surface,
    unusedBorder: tokens.colors.accent, <1>
  });
  return {
    root: css`
      ${look} <2>
      background: ${look.bg}; <3>
    `,
    loud: css`
      ${look.set({ bg: tokens.colors.accent })} <4>
    `,
  };
});
```

1. Never referenced, so this key is pruned — and so is the `colors.accent` default it would have pulled in.
2. Emits default declarations (`--eui-chip-look-bg: var(--eui-colors-surface)`).
3. Reads the var.
4. Override on this handle. Override entries emit after defaults, so stacking `root` and the modifier class wins.

Local-var names are `cssVarName(prefix, path)` (`--${prefix}-${module}-${group}-${key}`). A collision with a theme or shared var throws at module construction. See [name collisions](../guides/name-collisions.md).
