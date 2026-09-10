---
navigation_title: The distillery
description: Bind prefix and a theme tree with createDistillery.
---

# The distillery

`createDistillery(options)` binds the engine to one component library. The returned object is destructure-safe (no `this`): `environment`, `tokens`, `themeVars`, `registry`, `createStyleModule`, `primitiveStyles`, `artifactCollector`, `stylesheetCollector`, `renderStyles`, `createNameResolver`.

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

`environment` is the **resolved** environment: derived `themeVars` and `tokens`, plus `prefix` and `themeScope`. `distillery.tokens` and `distillery.themeVars` are the same objects. Input is `DistilleryOptions`.

Each distillery owns a private `StyleRegistry`. Two libraries in one process should each call `createDistillery` with their own prefix so readable names cannot collide across brands.

## Options

| Field        | Role                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `prefix`     | CSS identifier segment used in `cssVarName(prefix, path)` readable custom properties.                                                            |
| `themeScope` | Selector wrapping the emitted theme-variable block (`.eui-view`, `:host`, …).                                                                    |
| `theme`      | Nested value tree. Strings and `lightDark` leaves become theme vars; `cq` / `scaleToken` leaves inline. Keys match `/^[A-Za-z_][A-Za-z0-9_]*$/`. |
| `sharedVars` | Optional cross-module contextual-var paths. Names derive via `cssVarName`. Module-local `vars(...)` groups are not listed here.                  |
| `themes`     | Optional named overlays of `theme`. Declaring a theme does not emit it. See [theming](../guides/theming.md).                                     |

`prefix` is validated at construction. Theme-tree keys that contain `-` throw. `themeVars` and `sharedVars` that hyphenate to the same readable custom-property name throw. `lightDark` values that are not CSS `<color>` throw. Named `themes` overlays that introduce unknown paths or disagree on leaf kind throw.

See [declare and select themes](../guides/theming.md) for render-time `theme` and `alternates`.

`primitiveStyles(name, factory)` is the same registry path as `createStyleModule`, with `factory` receiving `{ style, tokens }` instead of the full authoring API. Use it when a module only needs handles and tokens.

See [environment reference](../reference/environment.md) for field-level types.
