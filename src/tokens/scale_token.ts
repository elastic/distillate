/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
