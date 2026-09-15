/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** Naming scheme: `compact` assigns sequential identifiers by sorted key index, `readable` emits descriptive ones. */
export type StyleNameMode = 'compact' | 'readable';
/** Destination format for the CSS collection. */
export type StyleTarget = 'artifact' | 'stylesheet';

/** Context for resolving keys into final class or custom-property names. */
export interface StyleNameResolver {
  /** The naming mode used by this resolver. */
  readonly names: StyleNameMode;
  /** Resolves a handle key into a CSS class name. */
  className(key: string, readableName?: string): string;
  /** Resolves a variable key into a custom property name. */
  cssVar(key: string): `--${string}`;
  /** Resolves a variable key into a `var(...)` reference. */
  cssVarRef(key: string): `var(--${string})`;
}

/** Inputs for {@link createStyleNameResolver}. */
export interface StyleNameResolverOptions {
  /** Naming strategy (`compact` or `readable`). */
  names: StyleNameMode;
  /** Brand prefix for readable names (`<prefix>-<key>` / `--<prefix>-<key>`), e.g. `'aui'`. */
  prefix: string;
  /** Keys defining the compact class-name domain. */
  classKeys?: Iterable<string>;
  /** Keys defining the compact custom-property domain. */
  cssVarKeys?: Iterable<string>;
}

const compactAlphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const compactNameForIndex = (index: number): string => {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Compact name index must be a non-negative integer.`);
  }

  const base = compactAlphabet.length;
  let remaining = index;
  let length = 1;

  while (remaining >= base ** length) {
    remaining -= base ** length;
    length += 1;
  }

  let name = '';
  for (let position = length - 1; position >= 0; position -= 1) {
    const divisor = base ** position;
    const digit = Math.floor(remaining / divisor);
    name += compactAlphabet[digit] ?? '';
    remaining %= divisor;
  }

  return name;
};

/** Compact names are assigned from sorted keys so emission is deterministic. */
export const createCompactNameMap = (
  keys: Iterable<string>
): ReadonlyMap<string, string> => {
  const uniqueKeys = [...new Set(keys)].sort();
  return new Map(
    uniqueKeys.map((key, index) => [key, compactNameForIndex(index)])
  );
};

const readableClassName = (
  prefix: string,
  key: string,
  fallback?: string
): string => fallback ?? `${prefix}-${key.replaceAll('/', '-')}`;

/**
 * Readable custom-property name: `--${prefix}-${path}` with `/` joined on `-` and a leading `vars/` stripped.
 *
 * @param prefix Brand prefix (e.g. `'eui'`).
 * @param path Theme or contextual-var path (e.g. `'colors/ink'`, `'vars/chip/look/bg'`).
 */
export const cssVarName = (prefix: string, path: string): `--${string}` =>
  `--${prefix}-${path.replace(/^vars\//, '').replaceAll('/', '-')}`;

const compactLookup = (
  map: ReadonlyMap<string, string>,
  key: string,
  kind: 'class' | 'CSS variable'
): string => {
  const name = map.get(key);
  if (!name) {
    throw new Error(`No compact ${kind} name registered for "${key}".`);
  }
  return name;
};

/** Maps semantic keys to readable (`<prefix>-<key>`) or compact (`a`, `b`, …) names. */
export const createStyleNameResolver = ({
  names,
  prefix,
  classKeys = [],
  cssVarKeys = [],
}: StyleNameResolverOptions): StyleNameResolver => {
  const classMap = createCompactNameMap(classKeys);
  const cssVarMap = createCompactNameMap(cssVarKeys);

  const cssVar = (key: string): `--${string}` => {
    if (names === 'readable') {
      return cssVarName(prefix, key);
    }
    return `--${compactLookup(cssVarMap, key, 'CSS variable')}`;
  };

  return {
    names,
    className: (key, fallback) => {
      if (names === 'readable') {
        return readableClassName(prefix, key, fallback);
      }
      return compactLookup(classMap, key, 'class');
    },
    cssVar,
    cssVarRef: (key) => `var(${cssVar(key)})`,
  };
};
