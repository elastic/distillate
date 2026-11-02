/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Guards over interpolated values and style entries, shared by authoring, collection, hashing, and rendering.

import { isLocalVarRef } from './local_vars';
import type { CssValue, StyleHandle } from './styles/types';
import {
  isContextualCssVar,
  isContextualCssVarName,
  isCssToken,
  isScaleToken,
} from './tokens';

/** `true` when `value` is a style entry of `kind` (`'handle'`, `'rule'`, `'media'`, `'pending-handle'`). */
export const hasEntryKind = (value: unknown, kind: string): boolean =>
  Boolean(
    value &&
    typeof value === 'object' &&
    (value as { kind?: unknown }).kind === kind
  );

export const isHandleLike = (value: unknown): value is StyleHandle =>
  hasEntryKind(value, 'handle');

/** `true` when `value` is a {@link CssValue}: a scalar that stringifies into a declaration. */
export const isCssValue = (value: unknown): value is CssValue =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  isCssToken(value) ||
  isContextualCssVar(value) ||
  isContextualCssVarName(value) ||
  isScaleToken(value) ||
  isLocalVarRef(value);

/** Short description of an unsupported value for error messages. */
export const describeValue = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (typeof value === 'object') {
    const { kind, __kind: brand } = value as { kind?: string; __kind?: string };
    return `object${kind ? ` (kind: ${kind})` : brand ? ` (${brand})` : ''}`;
  }
  return typeof value;
};
