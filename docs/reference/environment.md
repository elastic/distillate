---
navigation_title: Environment
description: DistilleryOptions, DistilleryEnvironment, and ThemeVarDefinition fields.
---

# Environment

`createDistillery` takes `DistilleryOptions`. `Distillery.environment` is the resolved form: derived `themeVars` and `tokens`.

## `DistilleryOptions`

| Field        | Type                             | Required | Notes                                                                                                           |
| ------------ | -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `prefix`     | `string`                         | yes      | CSS identifier segment. Used in readable class and CSS-variable names.                                          |
| `themeScope` | `string`                         | yes      | Selector wrapping the theme-variable block.                                                                     |
| `theme`      | `ThemeTree`                      | yes      | Nested value tree. Strings and `lightDark` become theme vars; `cq` / `scaleToken` inline.                       |
| `variations` | `Record<string, ThemeVariation>` | no       | Named value-only diffs of `theme`. Declaring a variation does not emit it. See [theming](../guides/theming.md). |
| `sharedVars` | `readonly \`vars/${string}\`[]`  | no       | Cross-module contextual-var paths. Names follow `cssVarName`.                                                   |
| `dev`        | `boolean`                        | no       | When `true`, collectors warn about no-op handles. Default `false`. Does not affect the single-copy guard.       |

Theme-tree keys must match `/^[A-Za-z_][A-Za-z0-9_]*$/`. Hyphens are rejected so hyphen-joined custom properties reverse uniquely.

## `DistilleryEnvironment`

| Field        | Type                                     | Notes                                                          |
| ------------ | ---------------------------------------- | -------------------------------------------------------------- |
| `prefix`     | `string`                                 | Copied from options.                                           |
| `themeScope` | `string`                                 | Copied from options.                                           |
| `themeVars`  | `Record<string, ThemeVarDefinition>`     | Derived. Emission sorts paths.                                 |
| `sharedVars` | `ReadonlySet<\`vars/${string}\`>`        | Optional. Path set from options.                               |
| `tokens`     | `TTokens`                                | Derived. Surfaced as `tokens` on the authoring API.            |
| `variations` | `Record<string, ResolvedThemeVariation>` | Optional. Resolved variations; absent when none were declared. |

`Distillery.tokens` aliases `environment.tokens`. `Distillery.themeVars` aliases `environment.themeVars`. `Distillery.resolveValues(scheme, variation?)` reshapes the theme into a nested literal tree for one scheme. See [read values outside CSS](../guides/non-css-surfaces.md).

## `ThemeVarDefinition`

| Field    | Type                | Notes                                                                         |
| -------- | ------------------- | ----------------------------------------------------------------------------- |
| `path`   | `string`            | Theme-tree path this definition was derived from.                             |
| `cssVar` | `` `--${string}` `` | Equal to `cssVarName(prefix, path)`.                                          |
| `light`  | `string`            | Light color-scheme value.                                                     |
| `dark`   | `string`            | Dark color-scheme value. Equal to `light` when the token is scheme-invariant. |

Differing `light` / `dark` fold into `light-dark(light, dark)`.

## `RenderStylesOptions`

Passed as the third argument to `distillery.renderStyles` / `renderStyles`.

| Field                 | Type                              | Notes                                                                                                                            |
| --------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `flatten`             | `string`                          | Flatten this declared variation into `themeScope`. Default is the base. A media variation does not replace the primary block.    |
| `alternates`          | `readonly ThemeAlternate[]`       | Extra blocks for runtime switching. Each entry emits only the variation's diff. `ThemeAlternate.variation` is the declared name. |
| `themeValueOverrides` | `Partial<Record<string, string>>` | Replace a collected token's emitted value. Wins over the flattened variation.                                                    |

A non-media alternate requires `selector`. A media-conditioned alternate may omit it and uses `themeScope`. See [declare and select variations](../guides/theming.md).

Paths are `themeVars` keys (`colors/ink`), not dotted paths.
