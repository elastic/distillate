---
navigation_title: The distillery
description: Bind prefix and a theme tree with createDistillery.
---

# The distillery

`createDistillery(options)` binds the engine to one component library. The returned object is destructure-safe (no `this`): `environment`, `tokens`, `themeVars`, `resolveValues`, `registry`, `owns`, `contextualVar`, `dev`, `createStyleModule`, `primitiveStyles`, `artifactCollector`, `stylesheetCollector`, `renderStyles`, `createNameResolver`.

```ts
import { createDistillery, cq, lightDark } from '@elastic/distillate';

const distillery = createDistillery({
  prefix: 'eui',
  themeScope: '.eui-view',
  theme: {
    colors: {
      ink: lightDark('#111', '#eee'),
    },
    gap: cq('8px', '2cqi'),
  },
  sharedVars: ['vars/app/tone/foreground'],
});
```

`environment` is the **resolved** environment: derived `themeVars` and `tokens`, plus `prefix` and `themeScope`. `distillery.tokens` aliases `environment.tokens`; `distillery.themeVars` aliases `environment.themeVars`. Input is `DistilleryOptions`.

Each distillery owns a private `StyleRegistry`. Two libraries in one process should each call `createDistillery` with their own prefix so readable names cannot collide across brands. A second brand that can diverge structurally is a second distillery, not a [variation](../guides/theming.md#when-not-to-use-a-variation).

## Options

| Field        | Role                                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `prefix`     | CSS identifier segment used in `cssVarName(prefix, path)` readable custom properties.                                                                                          |
| `themeScope` | Selector wrapping the emitted theme-variable block (`.eui-view`, `:host`, …).                                                                                                  |
| `theme`      | Nested value tree. Strings and `lightDark` leaves become theme vars; `cq` / `scaleToken` leaves inline. Keys match `/^[A-Za-z_][A-Za-z0-9_]*$/`.                               |
| `sharedVars` | Optional cross-module contextual-var paths. Names derive via `cssVarName`. Module-local `vars(...)` groups are not listed here.                                                |
| `variations` | Optional named value-only diffs of `theme`. Declaring a variation does not emit it. See [theming](../guides/theming.md).                                                       |
| `dev`        | Optional. When `true`, collectors warn about no-op handles and module authoring warns about contextual-var name drift. Default `false`. Does not affect the single-copy guard. |
| `warn`       | Optional sink for `dev` warnings. Defaults to `console.warn`. A collector's own `{ warn }` overrides it.                                                                       |

`prefix` is validated at construction. Theme-tree keys that contain `-` throw. `themeVars` and `sharedVars` that hyphenate to the same readable custom-property name throw. `lightDark` values that are not CSS `<color>` throw. Named `variations` that introduce unknown paths or disagree on leaf kind throw.

See [declare and select variations](../guides/theming.md) for render-time `flatten`, `scheme`, and `alternates`. `resolveValues(scheme, variation?)` returns the same tree as nested literal strings for a non-CSS surface; `renderStyles({ scheme })` emits the stylesheet with that scheme already chosen. See [read values outside CSS](../guides/non-css-surfaces.md).

`primitiveStyles(name, factory)` is the same registry path as `createStyleModule`, with `factory` receiving `{ style, tokens }` instead of the full authoring API. Use it when a module only needs handles and tokens.

`contextualVar(path)` builds a shared contextual var for a path declared in `sharedVars`, named `cssVarName(prefix, path)`. See [shared contextual vars](tokens.md#shared-contextual-vars).

`owns(handle)` is `true` when the handle was authored in a module registered with this distillery. A full handle is matched by its registered declarations, so an Emotion wrapper from `createEmotion(distillery)` counts and a handle from another distillery is rejected even when its key coincides; a bare `{ key }` is matched by key. Adapters that serve several distilleries use it to route a handle to the one that can collect it.

See [environment reference](../reference/environment.md) for field-level types.
