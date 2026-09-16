/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { extraLibSource, playgroundScopeNames } from './editor_lib';

const isDeclared = (source: string, name: string): boolean =>
  source.includes(`declare function ${name}`) ||
  source.includes(`declare const ${name}`);

describe('extraLibSource', () => {
  it('declares every emotion eval binding and omits native-only names', () => {
    const source = extraLibSource('emotion');
    for (const name of playgroundScopeNames('emotion')) {
      expect(isDeclared(source, name), name).toBe(true);
    }
    expect(source).toContain('readonly primary');
    expect(source).toContain('readonly accent');
    expect(source).toContain('readonly accentSecondary');
    expect(source).toContain('readonly success');
    expect(source).toContain('readonly warning');
    expect(source).toContain('readonly danger');
    expect(source).not.toContain('createStyleModule');
  });

  it('declares every native eval binding and omits emotion-only names', () => {
    const source = extraLibSource('native');
    for (const name of playgroundScopeNames('native')) {
      expect(isDeclared(source, name), name).toBe(true);
    }
    expect(source).toContain('LocalVarGroup');
    expect(source).not.toContain('injectGlobal');
  });
});
