---
navigation_title: Avoid readable-name collisions
description: Hyphen-joined class and variable names must be unique across the registry.
---

# Avoid readable-name collisions

Readable class names join path segments with hyphens: module `card` plus handle `header/title` becomes `card-header-title`. Module `card-header` plus handle `title` becomes the same string. Distillate throws at `createStyleModule` rather than emit two rules for one class.

```ts
distillery.createStyleModule('card', ({ css, tokens }) => ({
  header: {
    title: css`
      color: ${tokens.colors.ink};
    `,
  },
})); <1>
distillery.createStyleModule('card-header', ({ css, tokens }) => ({
  title: css`
    color: ${tokens.colors.accent};
  `,
})); <2>
```

1. Readable name: `card-header-title`.
2. Same readable name. Throws at `createStyleModule`.

Local vars join `--${prefix}-${module}-${group}-${key}` via `cssVarName`. These also throw:

- Two `vars` groups in one module that hyphen-join to the same property (`look` + `bg` vs `lo` + `ok-bg` is fine; `b-c`/`d` vs `b`/`c-d` is not).
- A local var that hyphenates to the same property as a theme or shared path (`chip` + `look`/`bg` vs theme path `chip/look/bg`).
- A theme path and a shared path that hyphenate to the same property (`colors/ink` vs `vars/colors/ink`).
- A theme-tree key that contains `-` (`colors-ink`). Hyphens are rejected so path segments reverse uniquely.

Compact mode is path-keyed and unaffected. Identifier segments (`prefix`, module names, group names, keys) must match `[A-Za-z_][A-Za-z0-9_-]*`. Hyphens are allowed so emotion modules named `css-${hash}` stay legal — they are also why collisions are possible.

Pick one nesting convention per library (flat handle names, or nested objects, not both colliding) and keep `prefix` short and unique.
