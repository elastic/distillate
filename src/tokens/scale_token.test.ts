/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { cq, isScaleToken, scaleToken } from './scale_token';

describe('scaleToken', () => {
  it('defaults the container-relative value to the literal', () => {
    const token = scaleToken('8px');
    expect(token.value).toBe('8px');
    expect(token.cq).toBe('8px');
    expect(`${token}`).toBe('8px');
    expect(isScaleToken(token)).toBe(true);
  });

  it('keeps a distinct container-relative value when given', () => {
    expect(cq('8px', '2cqi').cq).toBe('2cqi');
    expect(cq('8px', '2cqi').value).toBe('8px');
  });
});
