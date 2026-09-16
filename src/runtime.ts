/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StylesCollector } from './collector';
import { isOpaque, scanCss } from './css_scan';
import type { DistilleryEnvironment, ThemeVarDefinition } from './environment';
import {
  isLocalVarDefaultMarker,
  isLocalVarOverrideMarker,
  type LocalVarDefaultMarker,
  type LocalVarOverrideMarker,
} from './local_vars';
import { minifyCss } from './minify';
import { cssVarName, type StyleNameResolver } from './names';
import type {
  Declarations,
  DeclarationSegment,
  StyleHandle,
  StyleRule,
  StyleSelectorResolver,
} from './styles';
import { type ResolvedThemeVariation, serializedThemeValue } from './theme';

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
  const ctx: RenderContext = { environment, collector, resolver, options };
  const bodyFragments = collector.collectedEntries.map((entry) => {
    if (entry.kind === 'handle') {
      return renderHandle(entry, ctx);
    }
    if (entry.kind === 'rule') {
      return renderRule(entry, ctx);
    }
    return `@${entry.atRule ?? 'media'} ${entry.query}{${entry.rules
      .map((rule) => renderRule(rule, ctx))
      .join('')}}`;
  });
  const bodyCss = bodyFragments.join('');
  const fragments = [renderThemeVars(ctx), bodyCss];

  return minifyCss(fragments.join(''));
};

/** Per-render variation selection, alternate blocks, and value overrides. */
export interface RenderStylesOptions {
  /** Flatten this declared variation into `themeScope`. Default is the base. A media variation does not replace the primary block; it wraps its diffs in `@media`. */
  flatten?: string;
  /** Extra blocks for runtime switching. Each entry emits only the variation's diff. */
  alternates?: readonly ThemeAlternate[];
  /** Override a theme token's emitted value. */
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
): ResolvedThemeVariation => {
  const resolved = environment.variations?.[name];
  if (!resolved) {
    const declared = Object.keys(environment.variations ?? {});
    const suffix =
      declared.length > 0
        ? ` Declared: ${declared.join(', ')}.`
        : ' No variations were declared.';
    throw new Error(`Unknown variation "${name}".${suffix}`);
  }
  return resolved;
};

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
          ctx.options.themeValueOverrides?.[path]
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
  override: string | undefined
): string => override ?? serializedThemeValue(definition);

const renderHandle = (handle: StyleHandle, ctx: RenderContext): string => {
  const className = ctx.resolver.className(handle.key, handle.readableName);
  const body = renderDeclarations(handle.declarations, { handle }, ctx);
  return `.${className}{${body}}`;
};

const renderRule = (rule: StyleRule, ctx: RenderContext): string => {
  const selector = rule.selector(createSelectorResolver(rule, ctx));
  // Rules don't have a host handle for per-handle reachability — default
  // markers in a rule's declaration emit every listed key. In practice
  // authors place default markers on handle declarations; this branch keeps
  // the runtime well-defined if a rule ever does carry one.
  const body = renderDeclarations(rule.declarations, {}, ctx);
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
    return renderOverrideMarker(segment, ctx);
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
  const declarations: string[] = [];
  for (const { key, path, value } of marker.defaults) {
    if (reachable && !reachable.has(key)) {
      continue;
    }
    const stringified = stringifyMarkerValue(value);
    const resolvedValue = resolveStringSegment(stringified, ctx);
    const propIdentifier = ctx.resolver.cssVar(path);
    declarations.push(`${propIdentifier}:${resolvedValue}`);
  }
  return declarations.length > 0 ? `${declarations.join(';')};` : '';
};

const renderOverrideMarker = (
  marker: LocalVarOverrideMarker,
  ctx: RenderContext
): string => {
  const declarations: string[] = [];
  for (const { path, value } of marker.overrides) {
    const stringified = stringifyMarkerValue(value);
    const resolvedValue = resolveStringSegment(stringified, ctx);
    const propIdentifier = ctx.resolver.cssVar(path);
    declarations.push(`${propIdentifier}:${resolvedValue}`);
  }
  return declarations.length > 0 ? `${declarations.join(';')};` : '';
};

const stringifyMarkerValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { toString?: () => string }).toString === 'function' &&
    (value as { toString: () => string }).toString !== Object.prototype.toString
  ) {
    return (value as { toString: () => string }).toString();
  }
  throw new Error(
    `t.vars(...) value must be a string, number, theme token, contextual var, scale token, or local var ref; received ${describeValue(value)}.`
  );
};

const describeValue = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (typeof value === 'object') {
    return '[object Object]';
  }
  return `${typeof value}`;
};

const createSelectorResolver = (
  rule: StyleRule,
  ctx: RenderContext
): StyleSelectorResolver => {
  const { resolver } = ctx;
  const selectorResolver = ((handle: StyleHandle) =>
    resolver.className(
      handle.key,
      handle.readableName
    )) as StyleSelectorResolver;
  const module = ctx.collector.registry.module(rule.moduleName);
  for (const handle of module?.handleList ?? []) {
    defineSelectorAlias(selectorResolver, handle.localName, handle, resolver);
    const leafName = handle.localName.split('/').at(-1);
    if (leafName && leafName !== handle.localName) {
      defineSelectorAlias(selectorResolver, leafName, handle, resolver);
    }
  }
  return selectorResolver;
};

const defineSelectorAlias = (
  selectorResolver: StyleSelectorResolver,
  name: string,
  handle: StyleHandle,
  resolver: StyleNameResolver
): void => {
  if (!/^[A-Za-z_$][\w$]*$/.test(name) || name in selectorResolver) {
    return;
  }
  Object.defineProperty(selectorResolver, name, {
    configurable: true,
    enumerable: true,
    get: () => `.${resolver.className(handle.key, handle.readableName)}`,
  });
};

const resolveStringSegment = (cssText: string, ctx: RenderContext): string => {
  return scanCss(cssText)
    .map((span) =>
      isOpaque(span) ? span.text : resolveCodeSpan(span.text, ctx)
    )
    .join('');
};

const resolveCodeSpan = (cssText: string, ctx: RenderContext): string => {
  let result = cssText;
  const paths = new Set<string>([
    ...Object.keys(ctx.environment.themeVars),
    ...(ctx.environment.sharedVars ?? []),
    ...ctx.collector.collectedVarDeps,
  ]);
  for (const path of paths) {
    result = substituteReadableVar(result, path, ctx);
  }
  return result;
};

const substituteReadableVar = (
  cssText: string,
  path: string,
  ctx: RenderContext
): string => {
  const readableName = cssVarName(ctx.environment.prefix, path);
  const readableRef = `var(${readableName})`;
  let result = cssText;
  if (result.includes(readableRef)) {
    result = replaceAll(result, readableRef, ctx.resolver.cssVarRef(path));
  }
  if (containsCssIdentifier(result, readableName)) {
    result = replaceCssIdentifier(
      result,
      readableName,
      ctx.resolver.cssVar(path)
    );
  }
  return result;
};

const replaceAll = (
  value: string,
  search: string,
  replacement: string
): string => value.split(search).join(replacement);

const replaceCssIdentifier = (
  value: string,
  search: string,
  replacement: string
): string =>
  // Authored and generated CSS only contains valid custom property identifiers.
  // Since every searched token starts with "--", the trailing boundary is enough.
  value.replace(
    new RegExp(`${escapeRegExp(search)}(?![_a-zA-Z0-9-])`, 'g'),
    replacement
  );

const containsCssIdentifier = (value: string, search: string): boolean =>
  new RegExp(`${escapeRegExp(search)}(?![_a-zA-Z0-9-])`).test(value);

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
