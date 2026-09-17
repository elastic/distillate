/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { isVariantMarked, mapDomain, variants } from './authoring';

describe('mapDomain', () => {
  it('maps each domain key through the factory', () => {
    const record = mapDomain(['s', 'm'] as const, (size) => ({ size }));
    expect(record).toEqual({ s: { size: 's' }, m: { size: 'm' } });
    expect(isVariantMarked(record.s)).toBe(false);
  });
});

describe('variants', () => {
  it('marks mapped values without changing the record shape', () => {
    const record = variants(['calm', 'loud'] as const, (tone) => ({ tone }));
    expect(record).toEqual({
      calm: { tone: 'calm' },
      loud: { tone: 'loud' },
    });
    expect(isVariantMarked(record.calm)).toBe(true);
    expect(isVariantMarked(record.loud)).toBe(true);
  });
});
