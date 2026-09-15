/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { describe, expect, it } from 'vitest';

import {
  compactNameForIndex,
  createCompactNameMap,
  createStyleNameResolver,
  cssVarName,
} from './names';

describe('style name resolution', () => {
  it('generates letter-first compact names', () => {
    expect(compactNameForIndex(0)).toBe('a');
    expect(compactNameForIndex(25)).toBe('z');
    expect(compactNameForIndex(26)).toBe('A');
    expect(compactNameForIndex(51)).toBe('Z');
    expect(compactNameForIndex(52)).toBe('aa');
    expect(compactNameForIndex(53)).toBe('ab');
    expect(compactNameForIndex(103)).toBe('aZ');
    expect(compactNameForIndex(104)).toBe('ba');
  });

  it('sorts semantic keys before assigning compact names', () => {
    expect([...createCompactNameMap(['view/root', 'callout/root'])]).toEqual([
      ['callout/root', 'a'],
      ['view/root', 'b'],
    ]);
  });

  it('resolves readable class and CSS variable names from semantic keys', () => {
    const resolver = createStyleNameResolver({
      names: 'readable',
      prefix: 'aui',
    });

    expect(resolver.className('callout/root')).toBe('aui-callout-root');
    expect(resolver.cssVar('colors/text')).toBe('--aui-colors-text');
    expect(resolver.cssVarRef('colors/text')).toBe('var(--aui-colors-text)');
    expect(resolver.cssVar('vars/chip/look/bg')).toBe('--aui-chip-look-bg');
    expect(resolver.cssVar('vars/tone/foreground')).toBe(
      '--aui-tone-foreground'
    );
  });

  it('resolves compact class names and CSS variable names from registries', () => {
    const resolver = createStyleNameResolver({
      names: 'compact',
      prefix: 'aui',
      classKeys: ['view/root', 'callout/root'],
      cssVarKeys: ['colors/tone/success/foreground', 'colors/text'],
    });

    expect(resolver.className('callout/root')).toBe('a');
    expect(resolver.className('view/root')).toBe('b');
    expect(resolver.cssVar('colors/text')).toBe('--a');
    expect(resolver.cssVarRef('colors/tone/success/foreground')).toBe(
      'var(--b)'
    );
  });
});

describe('cssVarName', () => {
  it('hyphen-joins prefix and path, stripping a leading vars/', () => {
    expect(cssVarName('eui', 'colors/ink')).toBe('--eui-colors-ink');
    expect(cssVarName('eui', 'vars/chip/look/bg')).toBe('--eui-chip-look-bg');
    expect(cssVarName('eui', 'vars/tone/foreground')).toBe(
      '--eui-tone-foreground'
    );
    expect(cssVarName('eui', 'vars/a/b/c/d')).toBe('--eui-a-b-c-d');
    expect(cssVarName('dstl', 'color/accentSecondary')).toBe(
      '--dstl-color-accentSecondary'
    );
  });
});
