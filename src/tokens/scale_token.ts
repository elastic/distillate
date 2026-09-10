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

/** Represents a CSS scale size token. Stringifies to its literal value. */
export interface ScaleToken {
  /** Brand for {@link isScaleToken}. */
  readonly __kind: 'scale-token';
  /** Literal CSS value, inlined into declarations. */
  readonly value: string;
  /** Container-query-relative variant of `value`. */
  readonly cq: string;
  /** Stringifies to {@link ScaleToken.value}. */
  toString(): string;
  /** Template interpolation; same as {@link ScaleToken.toString}. */
  [Symbol.toPrimitive](hint: string): string;
}

/** Literal size token. Stringifies to `value`; `cq` is the container-relative variant. */
export const scaleToken = (value: string, cq: string): ScaleToken => {
  const valueToString = (): string => value;
  return {
    __kind: 'scale-token',
    value,
    cq,
    toString: valueToString,
    [Symbol.toPrimitive]: valueToString,
  };
};

/** Alias of {@link scaleToken} for theme-tree authoring. */
export const cq = scaleToken;

/** `true` when `value` is a {@link ScaleToken}. @param value Value to test. */
export const isScaleToken = (value: unknown): value is ScaleToken =>
  hasKind(value, 'scale-token');
