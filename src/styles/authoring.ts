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

import {
  type FlattenedTemplate,
  flattenTemplate,
  hasNestedSyntax,
  type SelectorAlternative,
} from '../nesting';

import { buildDeclarations } from './declarations';
import type {
  Declarations,
  PendingStyleHandle,
  RuleOptions,
  StyleHandle,
  StyleMedia,
  StyleRule,
  StyleSelectorResolver,
  StylesObject,
} from './types';

/** Shared empty `dependsOn` until module construction fills the real set. */
export const EMPTY_DEPS: ReadonlySet<string> = new Set();

/** Declaration-block template. Interpolations stringify; local-var markers stay until render. */
export const decls = (
  strings: TemplateStringsArray,
  ...values: readonly unknown[]
): Declarations => buildDeclarations(strings, values);

/** Handle template. Nested `&` / `@media` flatten into sibling rules. */
export const css = (
  strings: TemplateStringsArray,
  ...values: readonly unknown[]
): PendingStyleHandle => {
  if (!hasNestedSyntax(strings)) {
    return {
      kind: 'pending-handle',
      declarations: buildDeclarations(strings, values),
    };
  }
  return pendingHandleFromFlattened(
    flattenTemplate(strings, values, { mode: 'self' })
  );
};

/** Builds a pending handle (plus nested sibling descriptors) from a flattened template. */
export const pendingHandleFromFlattened = (
  flat: FlattenedTemplate
): PendingStyleHandle => {
  const selfSlice = flat.self ?? { strings: [''], values: [] };
  return {
    kind: 'pending-handle',
    declarations: buildDeclarations(selfSlice.strings, selfSlice.values),
    nested: flat.nested.map((entry) => {
      if (entry.kind === 'rule') {
        return {
          kind: 'nested-rule',
          alternatives: entry.alternatives,
          declarations: buildDeclarations(
            entry.slice.strings,
            entry.slice.values
          ),
        };
      }
      return {
        kind: 'nested-media',
        query: entry.query,
        ...(entry.self
          ? { self: buildDeclarations(entry.self.strings, entry.self.values) }
          : {}),
        rules: entry.rules.map((rule) => ({
          kind: 'nested-rule',
          alternatives: rule.alternatives,
          declarations: buildDeclarations(
            rule.slice.strings,
            rule.slice.values
          ),
        })),
      };
    }),
  };
};

/**
 * Selector plus declarations. `dependsOn` is filled when the module is constructed.
 *
 * @param selector Factory receiving a {@link StyleSelectorResolver}; uses `&` and handle aliases.
 * @param declarations CSS properties for this rule.
 * @param options `auto` controls whether the rule self-collects when its handle dependencies are met.
 */
export const rule = (
  selector: (h: StyleSelectorResolver) => string,
  declarations: Declarations,
  options: RuleOptions = {}
): StyleRule => ({
  kind: 'rule',
  moduleName: '',
  key: '',
  selector,
  declarations,
  // `dependsOn` is computed in `assignEntries` once the module's handles are
  // known. Authors construct rules outside that scope, so the placeholder is
  // an empty set until `assignEntries` rewrites the entry.
  dependsOn: EMPTY_DEPS,
  auto: options.auto ?? true,
  variant: false,
});

/**
 * `@media` block wrapping rules.
 *
 * @param query Media query string (e.g. `(min-width: 600px)`).
 * @param rules Inner rules scoped to this block.
 */
export const media = (
  query: string,
  rules: readonly StyleRule[]
): StyleMedia => ({
  kind: 'media',
  atRule: 'media',
  key: '',
  moduleName: '',
  query,
  rules,
  variant: false,
});

/**
 * `@container` block. `kind` stays `'media'` so emission rank matches {@link media}.
 *
 * @param query Container query string (e.g. `(min-width: 400px)`).
 * @param rules Inner rules scoped to this block.
 */
export const container = (
  query: string,
  rules: readonly StyleRule[]
): StyleMedia => ({
  kind: 'media',
  atRule: 'container',
  key: '',
  moduleName: '',
  query,
  rules,
  variant: false,
});

const variantMarkers = new WeakSet<object>();

export const isVariantMarked = (value: unknown): boolean =>
  Boolean(value && typeof value === 'object' && variantMarkers.has(value));

const markVariant = (value: unknown): void => {
  if (!value || typeof value !== 'object') {
    return;
  }
  variantMarkers.add(value);
};

/**
 * Builds a record of styles keyed by `domain`. Each value is marked `variant` so {@link index.StylesCollector#use | StylesCollector.use} skips it.
 *
 * @param domain All valid variant keys (e.g. `['primary', 'secondary']`).
 * @param factory Called once per key; returns the handle or nested style object for that variant.
 */
export const variants = <TKey extends string, TValue>(
  domain: readonly TKey[],
  factory: (value: TKey) => TValue
): Record<TKey, TValue> => {
  const record = Object.fromEntries(
    domain.map((value) => [value, factory(value)])
  ) as Record<TKey, TValue>;
  for (const value of Object.values(record)) {
    markVariant(value);
  }
  return record;
};

/**
 * Resolves handles through the collector's class-name resolver.
 *
 * @param context Object exposing `resolveClassName` (e.g. a React render context).
 * @param handles One or more handles to resolve and join.
 */
export const combineClassNames = (
  context: { resolveClassName: (...handles: StyleHandle[]) => string },
  ...handles: readonly StyleHandle[]
): string => context.resolveClassName(...handles);

const composeAbsoluteSelector =
  (alternatives: readonly SelectorAlternative[]) =>
  (h: StyleSelectorResolver): string =>
    alternatives
      .map((parts) =>
        parts
          .map((part) => (typeof part === 'string' ? part : `.${h(part)}`))
          .join('')
      )
      .join(',');

/** Authored `rule()`/`media()` entries from a global-mode flattened template. */
export const globalStylesFromFlattened = (
  flat: FlattenedTemplate
): StylesObject => {
  const styles: Record<string, StyleRule | StyleMedia> = {};
  flat.nested.forEach((entry, index) => {
    const localKey = `g${String(index).padStart(3, '0')}`;
    if (entry.kind === 'rule') {
      styles[localKey] = rule(
        composeAbsoluteSelector(entry.alternatives),
        buildDeclarations(entry.slice.strings, entry.slice.values)
      );
      return;
    }
    styles[localKey] = media(
      entry.query,
      entry.rules.map((nested) =>
        rule(
          composeAbsoluteSelector(nested.alternatives),
          buildDeclarations(nested.slice.strings, nested.slice.values)
        )
      )
    );
  });
  return styles;
};
