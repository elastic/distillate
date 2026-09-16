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

import type { ThemeVarDefinition } from './environment';
import { cssVarName } from './names';
import {
  type CssToken,
  isScaleToken,
  isSchemePair,
  lightDark,
  type ScaleToken,
  type SchemePair,
  themeToken,
} from './tokens';

/** Theme-tree keys omit `-` so hyphen-joined custom properties reverse uniquely. */
const THEME_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** One authoring leaf: invariant string, {@link lightDark} pair, or {@link ScaleToken}. */
export type ThemeLeaf = string | SchemePair | ScaleToken;

/** Nested authoring tree. Keys must match `/^[A-Za-z_][A-Za-z0-9_]*$/`. */
export type ThemeTree = {
  readonly [key: string]: ThemeLeaf | ThemeTree;
};

/** Per-scheme value tree accepted by {@link zipSchemes}. */
export type SchemeValueTree = {
  readonly [key: string]: string | ScaleToken | SchemeValueTree;
};

/** Token tree derived from an authoring {@link ThemeTree}. */
export type TokensOf<T> = T extends ScaleToken
  ? ScaleToken
  : T extends SchemePair | string
    ? CssToken
    : T extends object
      ? { readonly [K in keyof T]: TokensOf<T[K]> }
      : never;

/** Slash-delimited theme-var paths (excludes {@link ScaleToken} leaves). */
export type PathsOf<T, Prefix extends string = ''> = T extends ScaleToken
  ? never
  : T extends SchemePair | string
    ? Prefix extends ''
      ? never
      : Prefix
    : T extends object
      ? {
          [K in keyof T & string]: PathsOf<
            T[K],
            Prefix extends '' ? K : `${Prefix}/${K}`
          >;
        }[keyof T & string]
      : never;

/** {@link zipSchemes} output: equal strings collapse; differing strings become {@link SchemePair}. */
export type Zipped<T> = T extends ScaleToken
  ? ScaleToken
  : T extends string
    ? string | SchemePair
    : T extends object
      ? { readonly [K in keyof T]: Zipped<T[K]> }
      : never;

/** Partial variation of a {@link ThemeTree}. Leaves may change kind between `string` and {@link SchemePair}. */
export type DeepPartialTheme<T> = T extends ScaleToken
  ? ScaleToken
  : T extends SchemePair | string
    ? string | SchemePair
    : T extends object
      ? { readonly [K in keyof T]?: DeepPartialTheme<T[K]> }
      : never;

/** Media-conditioned variation. `media` is intrinsic; it is not a selector. */
export interface MediaThemeVariation<T extends ThemeTree = ThemeTree> {
  /** Media query wrapping this variation's emitted diffs. */
  readonly media: string;
  /** Partial variation of the base theme. */
  readonly variation: DeepPartialTheme<T>;
}

/** Named variation: a partial of the base, or a media-conditioned partial. */
export type ThemeVariation<T extends ThemeTree = ThemeTree> =
  DeepPartialTheme<T> | MediaThemeVariation<T>;

/** One named variation resolved against the base at construction. */
export interface ResolvedThemeVariation {
  /** Name passed in `variations`. */
  readonly name: string;
  /** Intrinsic media query, when declared. */
  readonly media?: string;
  /** Base theme vars with this variation applied. */
  readonly themeVars: Readonly<Record<string, ThemeVarDefinition>>;
  /** Paths whose serialized value differs from the base. */
  readonly diffs: Readonly<Record<string, ThemeVarDefinition>>;
}

/**
 * Folds two per-scheme trees into one authoring tree. Equal string leaves stay bare; differing strings become {@link lightDark}. {@link ScaleToken} leaves must agree.
 *
 * @param light Light-scheme value tree.
 * @param dark Dark-scheme value tree.
 * @throws If shapes, leaf kinds, or scale values disagree, or if a differing string pair is not a CSS `<color>`.
 */
export const zipSchemes = <T extends SchemeValueTree>(
  light: T,
  dark: T
): Zipped<T> => zipNode(light, dark, '') as Zipped<T>;

/** Walks `theme` into a {@link CssToken} / {@link ScaleToken} tree and a `themeVars` registry. */
export const deriveTheme = <T extends ThemeTree>(
  prefix: string,
  theme: T
): { tokens: TokensOf<T>; themeVars: Record<string, ThemeVarDefinition> } => {
  const themeVars: Record<string, ThemeVarDefinition> = {};
  const tokens = walk(theme, '', prefix, themeVars) as TokensOf<T>;
  return { tokens, themeVars };
};

/** Serialized `light` / `light-dark(light, dark)` form used in emission and diffs. */
export const serializedThemeValue = ({
  light,
  dark,
}: ThemeVarDefinition): string =>
  light === dark ? light : `light-dark(${light},${dark})`;

/**
 * Resolves named `variations` against `base`. Variations extend the base only (no chains).
 *
 * @throws If a variation introduces an unknown path, a leaf-kind mismatch, or a diverging {@link ScaleToken}.
 */
export const resolveThemeVariations = (
  prefix: string,
  base: ThemeTree,
  baseVars: Readonly<Record<string, ThemeVarDefinition>>,
  variations: Readonly<Record<string, ThemeVariation>> | undefined
): Readonly<Record<string, ResolvedThemeVariation>> => {
  if (!variations) {
    return {};
  }
  const out: Record<string, ResolvedThemeVariation> = {};
  for (const [name, declaration] of Object.entries(variations)) {
    const { media, variation } = unwrapThemeVariation(declaration, name);
    const merged = applyVariation(base, variation, name, '') as ThemeTree;
    const { themeVars } = deriveTheme(prefix, merged);
    const diffs: Record<string, ThemeVarDefinition> = {};
    for (const [path, definition] of Object.entries(themeVars)) {
      const baseDefinition = baseVars[path];
      if (
        !baseDefinition ||
        serializedThemeValue(definition) !==
          serializedThemeValue(baseDefinition)
      ) {
        diffs[path] = definition;
      }
    }
    out[name] = Object.freeze({
      name,
      themeVars: Object.freeze(themeVars),
      diffs: Object.freeze(diffs),
      ...(media ? { media } : {}),
    });
  }
  return Object.freeze(out);
};

const unwrapThemeVariation = (
  declaration: ThemeVariation,
  name: string
): { media?: string; variation: DeepPartialTheme<ThemeTree> } => {
  if (!isMediaThemeVariation(declaration)) {
    return { variation: declaration };
  }
  const extra = Object.keys(declaration).filter(
    (key) => key !== 'media' && key !== 'variation'
  );
  if (extra.length > 0) {
    throw new Error(
      `Variation "${name}" media declaration cannot include keys ${extra.map((key) => `"${key}"`).join(', ')}.`
    );
  }
  if (declaration.media.trim().length === 0) {
    throw new Error(`Variation "${name}" has an empty media query.`);
  }
  return { media: declaration.media, variation: declaration.variation };
};

const isMediaThemeVariation = (
  value: ThemeVariation
): value is MediaThemeVariation => {
  if (!isPlainObject(value)) {
    return false;
  }
  const candidate = value;
  return (
    typeof candidate.media === 'string' && isPlainObject(candidate.variation)
  );
};

const applyVariation = (
  base: unknown,
  variation: unknown,
  variationName: string,
  path: string
): unknown => {
  if (variation === undefined) {
    return base;
  }
  if (isScaleToken(base) || isScaleToken(variation)) {
    if (!isScaleToken(base) || !isScaleToken(variation)) {
      throw new Error(
        `Variation "${variationName}": "${path}" is a ScaleToken in one tree and not the other.`
      );
    }
    if (base.value !== variation.value || base.cq !== variation.cq) {
      throw new Error(
        `Variation "${variationName}": ScaleToken at "${path}" disagrees with the base (scale tokens inline and cannot vary by variation).`
      );
    }
    return base;
  }
  if (isSchemePair(variation) || typeof variation === 'string') {
    if (typeof base !== 'string' && !isSchemePair(base)) {
      throw new Error(
        `Variation "${variationName}": "${path}" is a leaf in the variation and a group in the base.`
      );
    }
    return variation;
  }
  if (isThemeGroup(variation) && isThemeGroup(base)) {
    const out: Record<string, unknown> = { ...base };
    for (const [key, child] of Object.entries(variation)) {
      if (!Object.hasOwn(base, key)) {
        throw new Error(
          `Variation "${variationName}": unknown path "${childPath(path, key)}".`
        );
      }
      out[key] = applyVariation(
        base[key],
        child,
        variationName,
        childPath(path, key)
      );
    }
    return out;
  }
  throw new Error(
    `Variation "${variationName}": "${path || '(root)'}" is not a valid partial.`
  );
};

const isThemeGroup = (value: unknown): value is Record<string, unknown> =>
  isPlainObject(value) && !isSchemePair(value) && !isScaleToken(value);

const walk = (
  node: unknown,
  path: string,
  prefix: string,
  themeVars: Record<string, ThemeVarDefinition>
): unknown => {
  if (isScaleToken(node)) {
    assertNotRoot(path);
    return node;
  }
  if (isSchemePair(node)) {
    assertNotRoot(path);
    return registerCssToken(path, prefix, node.light, node.dark, themeVars);
  }
  if (typeof node === 'string') {
    assertNotRoot(path);
    return registerCssToken(path, prefix, node, node, themeVars);
  }
  if (isPlainObject(node)) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(node)) {
      assertThemeKey(key);
      const childPath = path === '' ? key : `${path}/${key}`;
      out[key] = walk(child, childPath, prefix, themeVars);
    }
    return Object.freeze(out);
  }
  const label = path === '' ? 'theme root' : `"${path}"`;
  throw new Error(
    `Theme leaf at ${label} must be a string, lightDark(...), or ScaleToken.`
  );
};

const registerCssToken = (
  path: string,
  prefix: string,
  light: string,
  dark: string,
  themeVars: Record<string, ThemeVarDefinition>
): CssToken => {
  const cssVar = cssVarName(prefix, path);
  themeVars[path] = { path, cssVar, light, dark };
  return themeToken(path, cssVar);
};

const zipNode = (light: unknown, dark: unknown, path: string): unknown => {
  if (isScaleToken(light) || isScaleToken(dark)) {
    if (!isScaleToken(light) || !isScaleToken(dark)) {
      throw new Error(
        `zipSchemes: "${path}" is a ScaleToken in one scheme and not the other.`
      );
    }
    if (light.value !== dark.value || light.cq !== dark.cq) {
      throw new Error(
        `zipSchemes: ScaleToken at "${path}" disagrees across schemes.`
      );
    }
    return light;
  }
  if (typeof light === 'string' || typeof dark === 'string') {
    if (typeof light !== 'string' || typeof dark !== 'string') {
      throw new Error(
        `zipSchemes: "${path}" is a string in one scheme and not the other.`
      );
    }
    return light === dark ? light : lightDark(light, dark);
  }
  if (isPlainObject(light) && isPlainObject(dark)) {
    for (const key of Object.keys(light)) {
      if (!Object.hasOwn(dark, key)) {
        throw new Error(
          `zipSchemes: "${childPath(path, key)}" is missing in the dark tree.`
        );
      }
    }
    for (const key of Object.keys(dark)) {
      if (!Object.hasOwn(light, key)) {
        throw new Error(
          `zipSchemes: "${childPath(path, key)}" is missing in the light tree.`
        );
      }
    }
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(light)) {
      out[key] = zipNode(light[key], dark[key], childPath(path, key));
    }
    return out;
  }
  throw new Error(
    `zipSchemes: "${path || '(root)'}" must be a string, ScaleToken, or nested object.`
  );
};

const childPath = (path: string, key: string): string =>
  path === '' ? key : `${path}/${key}`;

const assertNotRoot = (path: string): void => {
  if (path === '') {
    throw new Error('Theme root must be an object.');
  }
};

const assertThemeKey = (key: string): void => {
  if (!THEME_KEY_RE.test(key)) {
    throw new Error(
      `Theme key "${key}" must match /^[A-Za-z_][A-Za-z0-9_]*$/ (hyphens are rejected so path segments reverse uniquely).`
    );
  }
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
