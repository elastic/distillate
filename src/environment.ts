/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ResolvedThemeVariation,
  ThemeTree,
  ThemeVariation,
} from './theme';

/** One theme CSS variable. Differing `light`/`dark` fold into `light-dark(...)`. */
export interface ThemeVarDefinition {
  /** Theme-tree path this definition was derived from. */
  readonly path: string;
  /** Emitted CSS custom property name. Equal to `cssVarName(prefix, path)`. */
  readonly cssVar: `--${string}`;
  /** Value for light color scheme. */
  readonly light: string;
  /** Value for dark color scheme. Equal to `light` for scheme-invariant tokens. */
  readonly dark: string;
}

/** Authoring input to `createDistillery`. */
export interface DistilleryOptions<TTheme extends ThemeTree = ThemeTree> {
  /** Brand identifier used in readable class and CSS-variable names. Must be a CSS identifier segment. */
  readonly prefix: string;
  /** Selector wrapping emitted theme-var declarations. */
  readonly themeScope: string;
  /** Nested value tree. Strings and `lightDark` leaves become theme vars; `ScaleToken` leaves inline. */
  readonly theme: TTheme;
  /** Named partial variations of `theme`. Declaring a variation does not emit it; name it at `renderStyles`. */
  readonly variations?: Readonly<Record<string, ThemeVariation<TTheme>>>;
  /** Cross-module contextual-var paths. Names are `cssVarName(prefix, path)`. Module-local `vars(...)` groups are not listed here. */
  readonly sharedVars?: readonly `vars/${string}`[];
  /** When `true`, collectors warn about no-op handles. Default `false`. Does not affect the single-copy guard. */
  readonly dev?: boolean;
}

/** Resolved environment: derived `themeVars` / `tokens` plus the bind-time prefix and scope. */
export interface DistilleryEnvironment<TTokens = unknown> {
  /** Brand identifier used in readable class and CSS-variable names. Must be a CSS identifier segment. */
  readonly prefix: string;
  /** Selector wrapping emitted theme-var declarations. */
  readonly themeScope: string;
  /** Theme token path → definition. Emission sorts paths. */
  readonly themeVars: Readonly<Record<string, ThemeVarDefinition>>;
  /** Cross-module contextual-var paths. Module-local `vars(...)` groups are not listed here. */
  readonly sharedVars?: ReadonlySet<`vars/${string}`>;
  /** Typed token tree, surfaced as `tokens` on the authoring API. */
  readonly tokens: TTokens;
  /** Named variations resolved against `themeVars`. Absent when no `variations` were declared. */
  readonly variations?: Readonly<Record<string, ResolvedThemeVariation>>;
}
