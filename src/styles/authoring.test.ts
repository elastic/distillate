/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { createLocalVarGroup } from '../local_vars';

import { decls, isVariantMarked, mapDomain, variants } from './authoring';
import { isEmptyDeclarations } from './declarations';

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

describe('isEmptyDeclarations', () => {
  it('is true when every segment is whitespace', () => {
    expect(isEmptyDeclarations(decls``)).toBe(true);
    expect(isEmptyDeclarations(decls`  \n  `)).toBe(true);
  });

  it('is false when the block has a declaration', () => {
    expect(isEmptyDeclarations(decls`color: red;`)).toBe(false);
  });

  it('is false when the block contains a local-var marker', () => {
    const look = createLocalVarGroup('eui', 'chip', 'look', { bg: 'red' });
    expect(isEmptyDeclarations(decls`${look}`)).toBe(false);
  });
});
