/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasKind } from './kind';

/** Scheme-varying color pair. Compiles to `light-dark(light, dark)`. */
export interface SchemePair {
  /** Brand for {@link isSchemePair}. */
  readonly __kind: 'scheme-pair';
  /** Light color-scheme value. Must be a CSS `<color>`. */
  readonly light: string;
  /** Dark color-scheme value. Must be a CSS `<color>`. */
  readonly dark: string;
}

/** `true` when `value` is a {@link SchemePair}. @param value Value to test. */
export const isSchemePair = (value: unknown): value is SchemePair =>
  hasKind(value, 'scheme-pair');

/**
 * Scheme-varying color pair. Both sides must be CSS `<color>` values.
 *
 * @param light Light color-scheme value.
 * @param dark Dark color-scheme value.
 * @throws If either value is not a CSS `<color>`.
 */
export const lightDark = (light: string, dark: string): SchemePair => {
  assertCssColor(light, 'light');
  assertCssColor(dark, 'dark');
  return { __kind: 'scheme-pair', light, dark };
};

const isCssColor = (value: string): boolean => {
  const trimmed = value.trim();
  if (/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(trimmed)) {
    return true;
  }
  if (/^(?:transparent|currentcolor)$/i.test(trimmed)) {
    return true;
  }
  return (
    /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|color)\(/i.test(
      trimmed
    ) && trimmed.endsWith(')')
  );
};

const assertCssColor = (value: string, side: 'light' | 'dark'): void => {
  if (!isCssColor(value)) {
    throw new Error(
      `lightDark() ${side} value "${value}" is not a CSS <color>; light-dark() would be dropped by the browser.`
    );
  }
};
