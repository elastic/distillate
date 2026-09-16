/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasKind } from './kind';

/** Represents a contextual CSS variable name. Stringifies to its custom property name. */
export interface ContextualCssVarName {
  /** Brand for {@link isContextualCssVarName}. */
  readonly __kind: 'contextual-var-name';
  /** Group/key path for this variable. */
  readonly path: `vars/${string}`;
  /** Actual emitted CSS custom property name. */
  readonly name: `--${string}`;
  /** Stringifies to {@link ContextualCssVarName.name}. */
  toString(): string;
  /** Template interpolation; same as {@link ContextualCssVarName.toString}. */
  [Symbol.toPrimitive](hint: string): string;
}

/** Represents a contextual CSS variable. Stringifies to `var(--...)`. */
export interface ContextualCssVar {
  /** Brand for {@link isContextualCssVar}. */
  readonly __kind: 'contextual-var';
  /** Group/key path for this variable. */
  readonly path: `vars/${string}`;
  /** Wrapper yielding just the custom property name. */
  readonly name: ContextualCssVarName;
  /** Usable CSS `var(...)` reference string. */
  readonly ref: `var(--${string})`;
  /** Stringifies to {@link ContextualCssVar.ref}. */
  toString(): string;
  /** Template interpolation; same as {@link ContextualCssVar.toString}. */
  [Symbol.toPrimitive](hint: string): string;
}

/** Shared contextual var. Stringifies to `var(<prop>)`; `.name` is the ident. */
export const contextualVar = (
  path: `vars/${string}`,
  prop: `--${string}`
): ContextualCssVar => {
  const ref: `var(--${string})` = `var(${prop})`;
  const propToString = (): string => prop;
  const refToString = (): string => ref;
  const name: ContextualCssVarName = {
    __kind: 'contextual-var-name',
    path,
    name: prop,
    toString: propToString,
    [Symbol.toPrimitive]: propToString,
  };
  return {
    __kind: 'contextual-var',
    path,
    name,
    ref,
    toString: refToString,
    [Symbol.toPrimitive]: refToString,
  };
};

/** `true` when `value` is a {@link ContextualCssVar}. @param value Value to test. */
export const isContextualCssVar = (value: unknown): value is ContextualCssVar =>
  hasKind(value, 'contextual-var');

/** `true` when `value` is a {@link ContextualCssVarName}. @param value Value to test. */
export const isContextualCssVarName = (
  value: unknown
): value is ContextualCssVarName => hasKind(value, 'contextual-var-name');
