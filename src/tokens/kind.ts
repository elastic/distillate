/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const hasField = (value: unknown, field: string, expected: string): boolean =>
  Boolean(
    value &&
    typeof value === 'object' &&
    (value as Record<string, unknown>)[field] === expected
  );

/** `true` when `value` carries the `__kind` brand `kind` (tokens, refs, markers). */
export const hasKind = (value: unknown, kind: string): boolean =>
  hasField(value, '__kind', kind);

/** `true` when `value` is a style entry of `kind` (`'handle'`, `'rule'`, `'media'`, `'pending-handle'`). */
export const hasEntryKind = (value: unknown, kind: string): boolean =>
  hasField(value, 'kind', kind);
