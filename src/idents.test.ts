/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { describe, expect, it } from 'vitest';

import { assertCssIdentSegment } from './idents';

describe('assertCssIdentSegment', () => {
  it('accepts letter-first segments including hyphens', () => {
    expect(() => assertCssIdentSegment('eui', 'prefix')).not.toThrow();
    expect(() => assertCssIdentSegment('card-header', 'module')).not.toThrow();
    expect(() => assertCssIdentSegment('_private', 'key')).not.toThrow();
  });

  it('rejects empty, slash, space, and digit-first segments', () => {
    expect(() => assertCssIdentSegment('', 'prefix')).toThrow(/prefix/);
    expect(() => assertCssIdentSegment('card/header', 'key')).toThrow(
      /CSS identifier segment/
    );
    expect(() => assertCssIdentSegment('a b', 'key')).toThrow();
    expect(() => assertCssIdentSegment('1card', 'module')).toThrow();
  });
});
