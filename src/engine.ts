/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StylesCollector } from './collector';
import type {
  DistilleryEnvironment,
  DistilleryOptions,
  ThemeVarDefinition,
} from './environment';
import { assertCssIdentSegment } from './idents';
import {
  createStyleNameResolver,
  type StyleNameMode,
  type StyleNameResolver,
  type StyleNameResolverOptions,
} from './names';
import { renderStyles, type RenderStylesOptions } from './runtime';
import {
  createStyleModuleWithEnvironment,
  type PrimitiveStyleAuthoringApi,
  readableVarOwnersFromEnvironment,
  type ResolvedStyles,
  type StyleAuthoringApi,
  StyleRegistry,
  type StylesModule,
  type StylesObject,
} from './styles';
import {
  deriveTheme,
  resolveThemeLayers,
  type ThemeTree,
  type TokensOf,
} from './theme';

/** One component library's binding: environment, registry, and pre-bound operations. Destructure-safe (no `this`). */
export interface Distillery<TTokens = unknown> {
  /** Resolved environment (tokens, prefix, derived theme vars). */
  readonly environment: DistilleryEnvironment<TTokens>;
  /** Derived token tree, same object as `environment.tokens`. */
  readonly tokens: TTokens;
  /** Derived theme-var registry, same object as `environment.themeVars`. */
  readonly themeVars: Readonly<Record<string, ThemeVarDefinition>>;
  /** The module registry accumulating collected handles and rules. */
  readonly registry: StyleRegistry;
  /** Named handle tree plus tokens. */
  readonly createStyleModule: <TStyles extends StylesObject>(
    name: string,
    factory: (api: StyleAuthoringApi<TTokens>) => TStyles
  ) => StylesModule<ResolvedStyles<TStyles>>;
  /** Named handles plus tokens only. */
  readonly primitiveStyles: <TStyles extends StylesObject>(
    name: string,
    factory: (api: PrimitiveStyleAuthoringApi<TTokens>) => TStyles
  ) => StylesModule<ResolvedStyles<TStyles>>;
  /** Collector for one render. Class-name resolution collects as a side effect. */
  readonly artifactCollector: (names: StyleNameMode) => StylesCollector;
  /** Collector preloaded with every registered module. */
  readonly stylesheetCollector: (names?: StyleNameMode) => StylesCollector;
  /** Emits collected CSS for this environment. */
  readonly renderStyles: (
    collector: StylesCollector,
    resolver?: StyleNameResolver,
    options?: RenderStylesOptions
  ) => string;
  /** Creates a standalone name resolver using this distillery's prefix. */
  readonly createNameResolver: (
    options: Omit<StyleNameResolverOptions, 'prefix'>
  ) => StyleNameResolver;
}

/**
 * Binds the engine to one library's prefix and theme tree.
 *
 * @param options Brand prefix, theme scope, and authoring theme tree.
 * @throws If `prefix` is not a CSS identifier segment, if a theme key contains a hyphen, if a `lightDark` value is not a CSS `<color>`, if a named theme disagrees with the base, or if `themeVars` / `sharedVars` claim the same readable custom-property name.
 */
export const createDistillery = <const TTheme extends ThemeTree>(
  options: DistilleryOptions<TTheme>
): Distillery<TokensOf<TTheme>> => {
  const {
    prefix,
    themeScope,
    theme,
    sharedVars: sharedVarList,
    themes,
  } = options;
  assertCssIdentSegment(prefix, 'Distillery prefix');
  const { tokens, themeVars } = deriveTheme(prefix, theme);
  const sharedVars = sharedVarList
    ? Object.freeze(new Set(sharedVarList))
    : undefined;
  const resolvedThemes = resolveThemeLayers(prefix, theme, themeVars, themes);
  const environment: DistilleryEnvironment<TokensOf<TTheme>> = {
    prefix,
    themeScope,
    themeVars: Object.freeze(themeVars),
    tokens,
    ...(sharedVars ? { sharedVars } : {}),
    ...(Object.keys(resolvedThemes).length > 0
      ? { themes: resolvedThemes }
      : {}),
  };
  const registry = new StyleRegistry(
    prefix,
    readableVarOwnersFromEnvironment(environment),
    sharedVars ?? new Set()
  );

  return {
    environment,
    tokens,
    themeVars: environment.themeVars,
    registry,
    createStyleModule: (name, factory) =>
      createStyleModuleWithEnvironment(environment, registry, name, factory),
    primitiveStyles: (name, factory) =>
      createStyleModuleWithEnvironment(
        environment,
        registry,
        name,
        ({ css: style, tokens: moduleTokens }) =>
          factory({ style, tokens: moduleTokens })
      ),
    artifactCollector: (names) =>
      new StylesCollector({ target: 'artifact', names, registry, prefix }),
    stylesheetCollector: (names = 'readable') => {
      const collector = new StylesCollector({
        target: 'stylesheet',
        names,
        registry,
        prefix,
      });
      for (const module of registry.modules) {
        collector.useAllEntries(module);
      }
      return collector;
    },
    renderStyles: (collector, resolver, renderOptions) =>
      renderStyles(environment, collector, resolver, renderOptions),
    createNameResolver: (resolverOptions) =>
      createStyleNameResolver({ ...resolverOptions, prefix }),
  };
};
