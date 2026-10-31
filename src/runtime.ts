/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StylesCollector } from './collector';
import { isBlankCss, isOpaque, scanCss } from './css_scan';
import type { DistilleryEnvironment, ThemeVarDefinition } from './environment';
import {
  isLocalVarDefaultMarker,
  isLocalVarOverrideMarker,
  type LocalVarDefaultMarker,
} from './local_vars';
import { minifyCss } from './minify';
import { cssVarName, type StyleNameResolver } from './names';
import { describeValue, isCssValue } from './nesting';
import {
  type ContextualVarPath,
  createSelectorResolver,
  type Declarations,
  type DeclarationSegment,
  stringifyCssValue,
  type StyleHandle,
  type StyleRule,
} from './styles';
import {
  requireThemeVariation,
  type ResolvedThemeVariation,
  serializedThemeValue,
} from './theme';

/**
 * Emits collected CSS: theme block, then entries, minified.
 *
 * @param environment Theme vars, prefix, and scope for this render.
 * @param collector Reachable entries and deps.
 * @param resolver Defaults to `collector.createResolver()`.
 */
export const renderStyles = (
  environment: DistilleryEnvironment<unknown>,
  collector: StylesCollector,
  resolver: StyleNameResolver = collector.createResolver(),
  options: RenderStylesOptions = {}
): string => {
  const ctx: RenderContext = {
    environment,
    collector,
    resolver,
    options,
    readableVars: createReadableVarLookup(environment, collector),
  };
  const bodyFragments = collector.collectedEntries.map((entry) => {
    if (entry.kind === 'handle') {
      return renderHandle(entry, ctx);
    }
    if (entry.kind === 'rule') {
      return renderRule(entry, ctx);
    }
    const inner = entry.rules
      .map((rule) => renderRule(rule, ctx))
      .filter((fragment) => fragment.length > 0);
    return inner.length > 0
      ? `@${entry.atRule ?? 'media'} ${entry.query}{${inner.join('')}}`
      : '';
  });
  const bodyCss = bodyFragments.join('');
  const fragments = [renderThemeVars(ctx), bodyCss];

  return minifyCss(fragments.join(''));
};

/** Per-render variation selection, scheme flatten, alternate blocks, and value overrides. */
export interface RenderStylesOptions {
  /** Flatten this declared variation into `themeScope`. Default is the base. A media variation does not replace the primary block; it wraps its diffs in `@media`. */
  flatten?: string;
  /**
   * Emit one scheme's literal instead of `light-dark(...)`.
   *
   * For a target with no color scheme to resolve the function against — an image or PDF backend, email HTML, an older browser.
   */
  scheme?: 'light' | 'dark';
  /** Extra blocks for runtime switching. Each entry emits only the variation's diff. */
  alternates?: readonly ThemeAlternate[];
  /** Override a theme token's emitted value, keyed by path, for values known only at request time. Wins over `flatten` and `scheme`. To emit one color scheme, use `scheme` instead of overriding every `lightDark` token. */
  themeValueOverrides?: Partial<Record<string, string>>;
}

/** One runtime-switched variation. `selector` is required unless the variation declares `media`. */
export interface ThemeAlternate {
  /** Name passed in `DistilleryOptions.variations`. */
  readonly variation: string;
  /** Consuming page selector, composed with `themeScope`. */
  readonly selector?: string;
}

interface RenderContext {
  /** Environment supplying theme vars, prefix, and scope. */
  environment: DistilleryEnvironment<unknown>;
  /** Reachable entries and deps for this render. */
  collector: StylesCollector;
  /** Class and CSS-var name resolver for this render. */
  resolver: StyleNameResolver;
  /** Per-render theme value overrides. */
  options: RenderStylesOptions;
  /** Readable var names to rewrite, built once per render. */
  readableVars: ReadableVarLookup;
}

const renderThemeVars = (ctx: RenderContext): string => {
  const { environment, options } = ctx;
  const selected = options.flatten
    ? themeVariation(environment, options.flatten)
    : undefined;
  const primaryVars =
    selected && !selected.media ? selected.themeVars : environment.themeVars;
  const blocks = [renderVarBlock(ctx, environment.themeScope, primaryVars)];
  if (selected?.media) {
    blocks.push(
      wrapMedia(
        selected.media,
        renderVarBlock(ctx, environment.themeScope, selected.diffs)
      )
    );
  }
  for (const alternate of options.alternates ?? []) {
    blocks.push(renderAlternate(ctx, alternate));
  }
  return blocks.join('');
};

const renderAlternate = (
  ctx: RenderContext,
  alternate: ThemeAlternate
): string => {
  const resolved = themeVariation(ctx.environment, alternate.variation);
  const selector = alternate.selector
    ? composeThemeSelector(ctx.environment.themeScope, alternate.selector)
    : resolved.media
      ? ctx.environment.themeScope
      : undefined;
  if (!selector) {
    throw new Error(
      `Alternate variation "${alternate.variation}" needs a selector (media-conditioned variations may omit one).`
    );
  }
  const block = renderVarBlock(ctx, selector, resolved.diffs);
  return resolved.media ? wrapMedia(resolved.media, block) : block;
};

const themeVariation = (
  environment: DistilleryEnvironment<unknown>,
  name: string
): ResolvedThemeVariation =>
  requireThemeVariation(environment.variations, name);

const renderVarBlock = (
  ctx: RenderContext,
  selector: string,
  vars: Readonly<Record<string, ThemeVarDefinition>>
): string => {
  const declarations = [...ctx.collector.collectedThemeDeps]
    .sort()
    .flatMap((path) => {
      const definition = vars[path];
      if (!definition) {
        return [];
      }
      return [
        `${ctx.resolver.cssVar(path)}:${formatThemeValue(
          definition,
          ctx.options.themeValueOverrides?.[path],
          ctx.options.scheme
        )}`,
      ];
    });
  return declarations.length > 0
    ? `${selector}{${declarations.join(';')}}`
    : '';
};

const wrapMedia = (query: string, block: string): string =>
  block.length > 0 ? `@media ${query}{${block}}` : '';

/** Composes `themeScope` with a per-render alternate selector. */
export const composeThemeSelector = (
  themeScope: string,
  selector: string
): string => {
  const scope = themeScope.trim();
  const extra = selector.trim();
  if (extra.length === 0) {
    throw new Error('Alternate selector must be non-empty.');
  }
  if (scope === ':host') {
    return extra.startsWith(':host') ? extra : `:host(${extra})`;
  }
  if (/^[.#[:]/.test(extra)) {
    return `${scope}${extra}`;
  }
  return `${scope} ${extra}`;
};

const formatThemeValue = (
  definition: ThemeVarDefinition,
  override: string | undefined,
  scheme: 'light' | 'dark' | undefined
): string =>
  override ?? (scheme ? definition[scheme] : serializedThemeValue(definition));

const renderHandle = (handle: StyleHandle, ctx: RenderContext): string => {
  const body = renderDeclarations(handle.declarations, { handle }, ctx);
  if (isBlankCss(body)) {
    return '';
  }
  const className = ctx.resolver.className(handle.key, handle.readableName);
  return `.${className}{${body}}`;
};

const renderRule = (rule: StyleRule, ctx: RenderContext): string => {
  // No host handle, so a default marker in a rule emits every key.
  const body = renderDeclarations(rule.declarations, {}, ctx);
  if (isBlankCss(body)) {
    return '';
  }
  const { resolver } = ctx;
  const handles =
    ctx.collector.registry.module(rule.moduleName)?.handleList ?? [];
  const selector = rule.selector(
    createSelectorResolver(handles, (handle) =>
      resolver.className(handle.key, handle.readableName)
    )
  );
  return `${selector}{${body}}`;
};

/** Host for default-marker emission: a handle enables per-handle reachability. */
interface DeclarationHostContext {
  /** Host handle whose refs narrow default-marker keys. Omitted for rules. */
  handle?: StyleHandle;
}

const renderDeclarations = (
  declarations: Declarations,
  host: DeclarationHostContext,
  ctx: RenderContext
): string => {
  const out: string[] = [];
  for (const segment of declarations.css) {
    out.push(renderSegment(segment, host, ctx));
  }
  return out.join('');
};

const renderSegment = (
  segment: DeclarationSegment,
  host: DeclarationHostContext,
  ctx: RenderContext
): string => {
  if (typeof segment === 'string') {
    return resolveStringSegment(segment, ctx);
  }
  if (isLocalVarDefaultMarker(segment)) {
    return renderDefaultMarker(segment, host, ctx);
  }
  if (isLocalVarOverrideMarker(segment)) {
    return renderMarkerItems(segment.overrides, ctx);
  }
  return '';
};

const renderDefaultMarker = (
  marker: LocalVarDefaultMarker,
  host: DeclarationHostContext,
  ctx: RenderContext
): string => {
  const reachable = host.handle
    ? ctx.collector.reachableDefaults(host.handle, marker.groupPath)
    : null;
  const items = reachable
    ? marker.defaults.filter(({ key }) => reachable.has(key))
    : marker.defaults;
  return renderMarkerItems(items, ctx);
};

const renderMarkerItems = (
  items: ReadonlyArray<{
    readonly path: ContextualVarPath;
    readonly value: unknown;
  }>,
  ctx: RenderContext
): string => {
  const declarations = items.map(
    ({ path, value }) =>
      `${ctx.resolver.cssVar(path)}:${resolveStringSegment(stringifyMarkerValue(value), ctx)}`
  );
  return declarations.length > 0 ? `${declarations.join(';')};` : '';
};

const stringifyMarkerValue = (value: unknown): string => {
  if (isCssValue(value)) {
    return stringifyCssValue(value);
  }
  throw new Error(
    `t.vars(...) value must be a string, number, theme token, contextual var, scale token, or local var ref; received ${describeValue(value)}.`
  );
};

const resolveStringSegment = (cssText: string, ctx: RenderContext): string => {
  if (!cssText.includes(ctx.readableVars.marker)) {
    return cssText;
  }
  return scanCss(cssText)
    .map((span) =>
      isOpaque(span) ? span.text : substituteReadableVars(span.text, ctx)
    )
    .join('');
};

/** Readable custom-property names this render may rewrite, keyed to their paths. */
interface ReadableVarLookup {
  /** `--${prefix}-`, the start of every readable name. */
  readonly marker: string;
  /** Readable name to path. The first path for a name wins. */
  readonly paths: ReadonlyMap<string, string>;
  /** Resolved names, filled on first use. */
  readonly resolved: Map<string, string>;
}

const createReadableVarLookup = (
  environment: DistilleryEnvironment<unknown>,
  collector: StylesCollector
): ReadableVarLookup => {
  const paths = new Map<string, string>();
  const add = (path: string): void => {
    const name = cssVarName(environment.prefix, path);
    if (!paths.has(name)) {
      paths.set(name, path);
    }
  };
  Object.keys(environment.themeVars).forEach(add);
  (environment.sharedVars ?? []).forEach(add);
  collector.collectedVarDeps.forEach(add);
  return {
    marker: `--${environment.prefix}-`,
    paths,
    resolved: new Map(),
  };
};

// `var(<name>)` resolves the same as `<name>`, since `cssVarRef(path)` is
// `var(${cssVar(path)})`, so only the identifier is rewritten.
const substituteReadableVars = (
  cssText: string,
  ctx: RenderContext
): string => {
  const { marker } = ctx.readableVars;
  let index = cssText.indexOf(marker);
  if (index === -1) {
    return cssText;
  }
  let result = '';
  let copied = 0;
  while (index !== -1) {
    const name = longestReadableNameAt(cssText, index, ctx.readableVars);
    if (name === undefined) {
      index = cssText.indexOf(marker, index + 1);
      continue;
    }
    result += cssText.slice(copied, index) + resolveReadableName(name, ctx);
    copied = index + name.length;
    index = cssText.indexOf(marker, copied);
  }
  return result + cssText.slice(copied);
};

// Matches a name only where the next character can't continue the identifier.
const longestReadableNameAt = (
  cssText: string,
  start: number,
  lookup: ReadableVarLookup
): string | undefined => {
  const minEnd = start + lookup.marker.length;
  let end = minEnd;
  while (end < cssText.length && !isNameTerminator(cssText.charCodeAt(end))) {
    end += 1;
  }
  for (let cut = end; cut > minEnd; cut -= 1) {
    if (cut < cssText.length && isIdentChar(cssText.charCodeAt(cut))) {
      continue;
    }
    const name = cssText.slice(start, cut);
    if (lookup.paths.has(name)) {
      return name;
    }
  }
  return undefined;
};

const resolveReadableName = (name: string, ctx: RenderContext): string => {
  const { paths, resolved } = ctx.readableVars;
  let value = resolved.get(name);
  if (value === undefined) {
    value = ctx.resolver.cssVar(paths.get(name)!);
    resolved.set(name, value);
  }
  return value;
};

const isIdentChar = (code: number): boolean =>
  code === 0x2d || // -
  code === 0x5f || // _
  (code >= 0x30 && code <= 0x39) ||
  (code >= 0x41 && code <= 0x5a) ||
  (code >= 0x61 && code <= 0x7a);

// Characters no theme or var path contains, which bound the name search.
const isNameTerminator = (code: number): boolean =>
  code <= 0x20 ||
  code === 0x22 || // "
  code === 0x27 || // '
  code === 0x28 || // (
  code === 0x29 || // )
  code === 0x2c || // ,
  code === 0x3b || // ;
  code === 0x7b || // {
  code === 0x7d; // }
