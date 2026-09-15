/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { hasKind } from './kind';

/** Represents a CSS theme token. Stringifies to `var(--...)`. */
export interface CssToken {
  /** Brand for {@link isCssToken}. */
  readonly __kind: 'theme-token';
  /** Path string mapping to this token in the environment. */
  readonly path: string;
  /** Actual emitted CSS custom property name. */
  readonly cssVar: `--${string}`;
  /** Usable CSS `var(...)` reference string. */
  readonly ref: `var(--${string})`;
  /** Stringifies to {@link CssToken.ref}. */
  toString(): string;
  /** Template interpolation; same as {@link CssToken.toString}. */
  [Symbol.toPrimitive](hint: string): string;
}

/** Theme token that stringifies to `var(<cssVar>)`. */
export const themeToken = (path: string, cssVar: `--${string}`): CssToken => {
  const ref: `var(--${string})` = `var(${cssVar})`;
  const refToString = (): string => ref;
  return {
    __kind: 'theme-token',
    path,
    cssVar,
    ref,
    toString: refToString,
    [Symbol.toPrimitive]: refToString,
  };
};

/** `true` when `value` is a {@link CssToken}. @param value Value to test. */
export const isCssToken = (value: unknown): value is CssToken =>
  hasKind(value, 'theme-token');
