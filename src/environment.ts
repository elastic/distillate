/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *	http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import type { ResolvedThemeLayer, ThemeDeclaration, ThemeTree } from './theme';

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
  /** Named partial overlays of `theme`. Declaring a theme does not emit it; name it at `renderStyles`. */
  readonly themes?: Readonly<Record<string, ThemeDeclaration<TTheme>>>;
  /** Cross-module contextual-var paths. Names are `cssVarName(prefix, path)`. Module-local `vars(...)` groups are not listed here. */
  readonly sharedVars?: readonly `vars/${string}`[];
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
  /** Named layers resolved against `themeVars`. Absent when no `themes` were declared. */
  readonly themes?: Readonly<Record<string, ResolvedThemeLayer>>;
}
