/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StylesCollector, type StylesCollectorOptions } from './collector';
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
import type { StyleSink } from './sink';
import {
  createStyleModuleWithEnvironment,
  type PrimitiveStyleAuthoringApi,
  readableVarOwnersFromEnvironment,
  type ResolvedStyles,
  type StyleAuthoringApi,
  type StyleHandle,
  StyleRegistry,
  type StylesModule,
  type StylesObject,
} from './styles';
import {
  deriveTheme,
  requireThemeVariation,
  resolveThemeValues,
  resolveThemeVariations,
  type ThemeTree,
  type TokensOf,
  type ValuesOf,
} from './theme';

/** Sink, render options, and warning sink for {@link Distillery.liveCollection}. */
export interface LiveCollectionOptions {
  /** Invalidated whenever the collection grows. Nothing is written before the first handle. */
  sink?: StyleSink;
  /** Options forwarded to `renderStyles` by `css()`. */
  render?: RenderStylesOptions;
  /** Warning sink for no-op handles. Used only when the distillery has `dev: true`. */
  warn?: (message: string) => void;
}

/**
 * Readable collection filled by one live render.
 *
 * Readable only: compact names depend on the complete collected set and need two passes.
 */
export interface LiveCollection {
  /** Underlying readable artifact collector. Mutations here (e.g. `use(globalModule)`, `useThemeVar`) also invalidate the sink. */
  readonly collector: StylesCollector;
  /** Collects `handles` and returns their readable class names, space-separated. */
  readonly resolveClassName: (...handles: StyleHandle[]) => string;
  /** Renders the CSS collected so far. */
  readonly css: () => string;
}

/** One component library's binding: environment, registry, and pre-bound operations. Destructure-safe (no `this`). */
export interface Distillery<
  TTokens = unknown,
  TTheme extends ThemeTree = ThemeTree,
> {
  /** Resolved environment (tokens, prefix, derived theme vars). */
  readonly environment: DistilleryEnvironment<TTokens>;
  /** Derived token tree, same object as `environment.tokens`. */
  readonly tokens: TTokens;
  /** Derived theme-var registry, same object as `environment.themeVars`. */
  readonly themeVars: Readonly<Record<string, ThemeVarDefinition>>;
  /** Nested literal values for one scheme. Optional `variation` is a name from `variations`. */
  readonly resolveValues: (
    scheme: 'light' | 'dark',
    variation?: string
  ) => ValuesOf<TTheme>;
  /** The module registry accumulating collected handles and rules. */
  readonly registry: StyleRegistry;
  /** When `true`, collectors warn about no-op handles. */
  readonly dev: boolean;
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
  /** Collector for one render. Class-name resolution collects as a side effect. No-op warnings require `dev: true`; pass `{ warn }` to capture them. */
  readonly artifactCollector: (
    names: StyleNameMode,
    options?: Pick<StylesCollectorOptions, 'warn'>
  ) => StylesCollector;
  /** Collector preloaded with every registered module. No-op warnings require `dev: true`; pass `{ warn }` to capture them. */
  readonly stylesheetCollector: (
    names?: StyleNameMode,
    options?: Pick<StylesCollectorOptions, 'warn'>
  ) => StylesCollector;
  /** Readable collection for one live render; keeps `sink` current as handles resolve. */
  readonly liveCollection: (options?: LiveCollectionOptions) => LiveCollection;
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
 * @throws If `prefix` is not a CSS identifier segment, if a theme key contains a hyphen, if a `lightDark` value is not a CSS `<color>`, if a named variation disagrees with the base, or if `themeVars` / `sharedVars` claim the same readable custom-property name.
 */
export const createDistillery = <const TTheme extends ThemeTree>(
  options: DistilleryOptions<TTheme>
): Distillery<TokensOf<TTheme>, TTheme> => {
  const {
    prefix,
    themeScope,
    theme,
    sharedVars: sharedVarList,
    variations,
    dev = false,
  } = options;
  assertCssIdentSegment(prefix, 'Distillery prefix');
  const { tokens, themeVars } = deriveTheme(prefix, theme);
  const sharedVars = sharedVarList
    ? Object.freeze(new Set(sharedVarList))
    : undefined;
  const resolvedVariations = resolveThemeVariations(
    prefix,
    theme,
    themeVars,
    variations
  );
  const environment: DistilleryEnvironment<TokensOf<TTheme>> = {
    prefix,
    themeScope,
    themeVars: Object.freeze(themeVars),
    tokens,
    ...(sharedVars ? { sharedVars } : {}),
    ...(Object.keys(resolvedVariations).length > 0
      ? { variations: resolvedVariations }
      : {}),
  };
  const registry = new StyleRegistry(
    prefix,
    readableVarOwnersFromEnvironment(environment),
    sharedVars ?? new Set()
  );

  const artifactCollector = (
    names: StyleNameMode,
    collectorOptions?: Pick<StylesCollectorOptions, 'warn'>
  ): StylesCollector =>
    new StylesCollector({
      target: 'artifact',
      names,
      registry,
      prefix,
      dev,
      ...(collectorOptions?.warn ? { warn: collectorOptions.warn } : {}),
    });

  return {
    environment,
    tokens,
    themeVars: environment.themeVars,
    resolveValues: (scheme, variation) =>
      resolveThemeValues(
        theme,
        themeVars,
        scheme,
        variation === undefined
          ? undefined
          : requireThemeVariation(environment.variations, variation)
      ),
    registry,
    dev,
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
    artifactCollector,
    stylesheetCollector: (names = 'readable', options) => {
      const collector = new StylesCollector({
        target: 'stylesheet',
        names,
        registry,
        prefix,
        dev,
        ...(options?.warn ? { warn: options.warn } : {}),
      });
      for (const module of registry.modules) {
        collector.useAllEntries(module);
      }
      return collector;
    },
    liveCollection: ({ sink, render, warn } = {}) => {
      const collector = artifactCollector('readable', warn ? { warn } : {});
      const css = (): string =>
        renderStyles(environment, collector, undefined, render);
      if (sink) {
        collector.subscribe(() => sink.invalidate(css));
      }
      return {
        collector,
        resolveClassName: (...handles) =>
          collector
            .useHandles(handles)
            .map((handle) => handle.readableName)
            .join(' '),
        css,
      };
    },
    renderStyles: (collector, resolver, renderOptions) =>
      renderStyles(environment, collector, resolver, renderOptions),
    createNameResolver: (resolverOptions) =>
      createStyleNameResolver({ ...resolverOptions, prefix }),
  };
};
