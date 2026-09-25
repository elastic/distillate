/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Distillery } from './engine';
import { contentHash64 } from './hash';
import { flattenTemplate, isHandleLike, type TemplateSlice } from './nesting';
import type { StyleSink } from './sink';
import {
  globalStylesFromFlattened,
  pendingHandleFromFlattened,
  type StyleHandle,
  type StyleRegistry,
  type StylesModule,
} from './styles';

export {
  createDomSink,
  type CreateDomSinkOptions,
  type DocumentLike,
  type StyleElementLike,
  type StyleParentLike,
} from './dom_sink';
export type { StyleSink } from './sink';

/** Shared sink for Emotion compat modules on one registry. */
export interface CreateEmotionOptions {
  /** Notified when a compat module registers. Shared across `createEmotion` calls on the same registry. */
  sink?: StyleSink;
}

/** Style handle that stringifies to its readable class name. */
export interface EmotionCss extends StyleHandle {
  /** Stringifies to the readable class name. */
  toString(): string;
  /** Template interpolation; same as {@link EmotionCss.toString}. */
  [Symbol.toPrimitive](hint: string): string;
}

/** One `cx(...)` argument: a class, handle, list, or truthy map. */
export type ClassNameArg =
  | string
  | number
  | false
  | null
  | undefined
  | EmotionCss
  | StyleHandle
  | ClassNameArg[]
  | { readonly [className: string]: boolean };

/** Emotion-shaped authoring API bound to one Distillery registry. */
export interface Emotion {
  /** Authors styles and returns a handle that can be used directly or passed to `cx`. */
  css(strings: TemplateStringsArray, ...values: readonly unknown[]): EmotionCss;
  /** Combines handles, conditional classes, and plain strings into a space-separated string. */
  cx(...args: readonly ClassNameArg[]): string;
  /** Defines styles that apply globally (e.g. `body`, `html`). */
  injectGlobal(
    strings: TemplateStringsArray,
    ...values: readonly unknown[]
  ): void;
  /** Emits the full CSS for all generated emotion styles. */
  stylesheet(): string;
  /** Returns the underlying modules backing `injectGlobal` calls. */
  globalModules(): readonly StylesModule[];
}

/** Per-registry Emotion compat cache. */
interface EmotionState {
  /** `css` handles keyed by source hash. */
  readonly wrappers: Map<string, EmotionCss>;
  /** Original templates for inlining nested compat handles. */
  readonly rawSources: Map<string, TemplateSlice>;
  /** Module name → canonical source hash. */
  readonly canonicalByModule: Map<string, string>;
  /** Modules produced by `injectGlobal`. */
  readonly globals: StylesModule[];
  /** Handles created by this registry's Emotion instance. */
  readonly brand: WeakSet<object>;
  /** Sinks notified when a compat module registers. */
  readonly sinks: Set<StyleSink>;
}

const stateByRegistry = new WeakMap<StyleRegistry, EmotionState>();

const stateFor = (registry: StyleRegistry): EmotionState => {
  let state = stateByRegistry.get(registry);
  if (!state) {
    state = {
      wrappers: new Map(),
      rawSources: new Map(),
      canonicalByModule: new Map(),
      globals: [],
      brand: new WeakSet(),
      sinks: new Set(),
    };
    stateByRegistry.set(registry, state);
  }
  return state;
};

/**
 * `@emotion/css`-shaped API over a distillery.
 *
 * `String(css\`...\`)` is the readable class name and does not collect. Passing the wrapper through `resolveClassName` collects and compacts like a native handle.
 *
 * @param distillery Bound distillery that owns the underlying registry.
 * @param options Optional sink for DOM injection.
 */
export const createEmotion = <TTokens>(
  distillery: Distillery<TTokens>,
  options: CreateEmotionOptions = {}
): Emotion => {
  const { registry } = distillery;
  const state = stateFor(registry);

  const stylesheet = (): string =>
    distillery.renderStyles(distillery.stylesheetCollector('readable'));

  const invalidateSinks = (): void => {
    for (const sink of state.sinks) {
      sink.invalidate(stylesheet);
    }
  };

  if (options.sink) {
    state.sinks.add(options.sink);
    // Catch a late-attached sink up to styles already registered on this
    // registry: cached `css`/`injectGlobal` calls return early without
    // invalidating, so without this the managed `<style>` would miss every
    // style registered before the sink was attached.
    options.sink.invalidate(stylesheet);
  }

  const inlineValue = (
    value: unknown,
    position: 'selector' | 'statement'
  ): TemplateSlice | null => {
    if (position !== 'statement' || !isBranded(state, value)) {
      return null;
    }
    return state.rawSources.get((value as StyleHandle).key) ?? null;
  };

  const css = (
    strings: TemplateStringsArray,
    ...values: readonly unknown[]
  ): EmotionCss => {
    assertTemplate(strings, 'css');
    const hash = contentHash64(strings, values);
    const cached = state.wrappers.get(hash);
    if (cached) {
      return cached;
    }
    const moduleName = `css-${hash}`;
    const canonical = canonicalKey(strings, values);
    detectCollision(state, moduleName, canonical);

    const flat = flattenTemplate(strings, values, {
      mode: 'self',
      inlineValue,
    });
    const pending = pendingHandleFromFlattened(flat);
    const module = distillery.createStyleModule(moduleName, () => ({
      root: pending,
    }));
    const handle = module.handles.root;

    state.rawSources.set(handle.key, {
      strings: [...strings],
      values: [...values],
    });
    const wrapper = makeWrapper(handle);
    state.brand.add(wrapper);
    state.wrappers.set(hash, wrapper);
    state.canonicalByModule.set(moduleName, canonical);
    invalidateSinks();
    return wrapper;
  };

  const injectGlobal = (
    strings: TemplateStringsArray,
    ...values: readonly unknown[]
  ): void => {
    assertTemplate(strings, 'injectGlobal');
    const hash = contentHash64(strings, values);
    const moduleName = `global-${hash}`;
    if (registry.module(moduleName)) {
      return;
    }
    const canonical = canonicalKey(strings, values);
    detectCollision(state, moduleName, canonical);

    const flat = flattenTemplate(strings, values, {
      mode: 'global',
      inlineValue,
    });
    const module = distillery.createStyleModule(moduleName, () =>
      globalStylesFromFlattened(flat)
    );
    state.canonicalByModule.set(moduleName, canonical);
    state.globals.push(module);
    invalidateSinks();
  };

  const cx = (...args: readonly ClassNameArg[]): string => {
    const classes: string[] = [];
    const walk = (arg: ClassNameArg): void => {
      if (!arg) {
        return;
      }
      if (typeof arg === 'string') {
        classes.push(arg);
        return;
      }
      if (typeof arg === 'number') {
        classes.push(String(arg));
        return;
      }
      if (Array.isArray(arg)) {
        arg.forEach(walk);
        return;
      }
      if (isBranded(state, arg)) {
        classes.push(String(arg));
        return;
      }
      if (isHandleLike(arg)) {
        classes.push(arg.readableName);
        return;
      }
      for (const [className, enabled] of Object.entries(arg)) {
        if (enabled) {
          classes.push(className);
        }
      }
    };
    args.forEach(walk);
    return classes.join(' ');
  };

  return {
    css,
    cx,
    injectGlobal,
    stylesheet,
    globalModules: () => [...state.globals],
  };
};

const makeWrapper = (handle: StyleHandle): EmotionCss => {
  const readable = handle.readableName;
  const asString = (): string => readable;
  // Spread copy keeps `resolveClassName` (closed over the original handle) and
  // `key` intact so collector dedupe and compaction work unchanged.
  const wrapper = { ...handle } as EmotionCss & {
    toString: () => string;
    [Symbol.toPrimitive]: () => string;
  };
  wrapper.toString = asString;
  wrapper[Symbol.toPrimitive] = asString;
  return wrapper;
};

const isBranded = (state: EmotionState, value: unknown): value is EmotionCss =>
  Boolean(value && typeof value === 'object' && state.brand.has(value));

const assertTemplate = (strings: unknown, fn: string): void => {
  if (!Array.isArray(strings) || !('raw' in (strings as object))) {
    throw new Error(
      `${fn} is a template tag; object styles (${fn}({...})) are not supported.`
    );
  }
};

const detectCollision = (
  state: EmotionState,
  moduleName: string,
  canonical: string
): void => {
  const prior = state.canonicalByModule.get(moduleName);
  if (prior !== undefined && prior !== canonical) {
    throw new Error(
      `Content-hash collision for "${moduleName}"; two distinct templates hashed to the same name.`
    );
  }
};

// A cheap, exact collision tripwire independent of the (lossy) hash. NUL-joins
// strings and String()s values — good enough because it is only ever compared
// against another canonical string for the same module name.
const canonicalKey = (
  strings: readonly string[],
  values: readonly unknown[]
): string => {
  const segments: string[] = [];
  strings.forEach((part, index) => {
    segments.push(part);
    if (index < values.length) {
      segments.push(String(values[index]));
    }
  });
  return segments.join('\u0000');
};
