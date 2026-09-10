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
