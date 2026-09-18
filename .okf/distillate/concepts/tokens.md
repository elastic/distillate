---
type: Concept
title: Tokens and vars
description: Theme trees, lightDark, cq, contextualVar, and module-local t.vars groups.
resource: https://github.com/elastic/distillate/blob/main/src/theme.ts
tags: [distillate, tokens, vars]
status: stable
stale_after: 2027-03-11
generated: { by: anthropic/claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
sources:
  - id: theme
    resource: https://github.com/elastic/distillate/blob/main/src/theme.ts
    title: Theme derivation and zipSchemes
  - id: light-dark
    resource: https://github.com/elastic/distillate/blob/main/src/tokens/light_dark.ts
    title: SchemePair and lightDark
  - id: css-token
    resource: https://github.com/elastic/distillate/blob/main/src/tokens/theme_token.ts
    title: CssToken and themeToken
  - id: scale-token
    resource: https://github.com/elastic/distillate/blob/main/src/tokens/scale_token.ts
    title: ScaleToken, scaleToken, and cq
  - id: contextual-var
    resource: https://github.com/elastic/distillate/blob/main/src/tokens/contextual_var.ts
    title: contextualVar
  - id: local-vars
    resource: https://github.com/elastic/distillate/blob/main/src/local_vars.ts
    title: t.vars group implementation
---

# Definition

Author a nested value tree. `createDistillery` derives `CssToken` / `ScaleToken` leaves and the `themeVars` registry. Three branded values stringify through `Symbol.toPrimitive`:

- `string` or `lightDark(light, dark)` → `CssToken` (`var(--...)`). Path is the slash-joined tree walk. Unread tokens are pruned. `lightDark` values must be CSS `<color>`.[^light-dark][^css-token]
- `cq(value, cq)` / `scaleToken(value, cq)` → inlined literal. `.cq` is the container-relative variant.[^scale-token]
- `contextualVar(path, prop)` → shared var. `.name` declares; interpolating the var reads. Register the path in `sharedVars`.[^contextual-var]

`zipSchemes(light, dark)` folds two per-scheme trees into the authoring form. Equal strings stay bare; differing strings become `lightDark`; `ScaleToken` leaves must agree.[^theme]

`resolveThemeValues(theme, themeVars, scheme, variation?)` (also `distillery.resolveValues`) returns the same tree as nested literal strings for one scheme. `ScaleToken` leaves become `.value`. Named variations apply `diffs` over the base. Surfaces that cannot resolve `var(--x)` use this instead of flattening `themeVars` by hand. Surfaces that still want the stylesheet, but have no color scheme for `light-dark()` to resolve against, pass `{ scheme }` to `renderStyles`.

Named variations go on `variations` in `createDistillery`. Declaring a variation does not emit it; name it at `renderStyles` with `{ flatten }` or `{ alternates }`. Variations extend the base only. `ScaleToken` leaves must match the base because they inline and cannot vary. See [the distillery](/concepts/distillery.md).

`t.vars(group, defaults)` returns a module-local group. `${group}` emits defaults, `${group.key}` reads, `${group.set({...})}` overrides. Override entries emit after defaults. Unreferenced default keys are pruned.[^local-vars]

Readable local names are `cssVarName(prefix, path)` (`--${prefix}-${module}-${group}-${key}` for `t.vars`). Collisions with theme or shared vars throw. Theme-tree keys match `/^[A-Za-z_][A-Za-z0-9_]*$/`. See [public contract](/reference/public-contract.md).

[^theme]: Theme derivation and zipSchemes

[^light-dark]: SchemePair and lightDark

[^css-token]: CssToken and themeToken

[^scale-token]: ScaleToken, scaleToken, and cq

[^contextual-var]: contextualVar

[^local-vars]: t.vars group implementation
