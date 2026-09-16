/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { createDistillery } from './engine';
import { tokenTreeDts } from './testing';
import { zipSchemes } from './theme';
import {
  cq,
  isCssToken,
  isScaleToken,
  isSchemePair,
  lightDark,
} from './tokens';

describe('lightDark', () => {
  it('accepts hex and rgb colors', () => {
    expect(lightDark('#111', 'rgb(238 238 238)')).toEqual({
      __kind: 'scheme-pair',
      light: '#111',
      dark: 'rgb(238 238 238)',
    });
  });

  it('throws when a scheme-varying leaf is not a CSS color', () => {
    expect(() => lightDark('8px', '2cqi')).toThrow(/not a CSS <color>/);
  });
});

describe('zipSchemes', () => {
  it('collapses equal strings and wraps differing colors', () => {
    const zipped = zipSchemes(
      {
        colors: { ink: '#111', accent: '#06c', warning: '#FACB3D' },
        gap: cq('8px', '2cqi'),
      },
      {
        colors: { ink: '#eee', accent: '#8cf', warning: '#FACB3D' },
        gap: cq('8px', '2cqi'),
      }
    );
    expect(isSchemePair(zipped.colors.ink)).toBe(true);
    expect(zipped.colors.warning).toBe('#FACB3D');
    expect(isScaleToken(zipped.gap)).toBe(true);
  });

  it('throws when a key is missing in one tree', () => {
    expect(() =>
      zipSchemes({ colors: { ink: '#111' } }, { colors: {} })
    ).toThrow(/"colors\/ink" is missing in the dark tree/);
  });

  it('throws when ScaleToken leaves disagree', () => {
    expect(() =>
      zipSchemes({ gap: cq('8px', '2cqi') }, { gap: cq('16px', '2cqi') })
    ).toThrow(/ScaleToken at "gap" disagrees/);
  });

  it('throws when leaf kinds disagree', () => {
    expect(() =>
      zipSchemes({ gap: cq('8px', '2cqi') }, { gap: '#111' })
    ).toThrow(/ScaleToken in one scheme/);
  });
});

describe('createDistillery theme derivation', () => {
  it('derives nested CssToken paths and inlines ScaleToken leaves', () => {
    const distillery = createDistillery({
      prefix: 'eui',
      themeScope: '.eui-view',
      theme: {
        colors: {
          ink: lightDark('#111', '#eee'),
          warning: '#FACB3D',
        },
        gap: cq('8px', '2cqi'),
      },
    });
    const { tokens, themeVars } = distillery;
    expect(isCssToken(tokens.colors.ink)).toBe(true);
    expect(tokens.colors.ink.path).toBe('colors/ink');
    expect(tokens.colors.ink.cssVar).toBe('--eui-colors-ink');
    expect(themeVars['colors/ink']).toMatchObject({
      path: 'colors/ink',
      cssVar: '--eui-colors-ink',
      light: '#111',
      dark: '#eee',
    });
    expect(themeVars['colors/warning']).toMatchObject({
      light: '#FACB3D',
      dark: '#FACB3D',
    });
    expect(themeVars.gap).toBeUndefined();
    expect(isScaleToken(tokens.gap)).toBe(true);
    expect(tokens).toBe(distillery.environment.tokens);
    expect(themeVars).toBe(distillery.environment.themeVars);
  });

  it('throws when a theme key contains a hyphen', () => {
    expect(() =>
      createDistillery({
        prefix: 'eui',
        themeScope: '.x',
        theme: { 'colors-ink': '#111' },
      })
    ).toThrow(/Theme key "colors-ink"/);
  });

  it('throws when a named variation introduces an unknown path', () => {
    expect(() =>
      createDistillery({
        prefix: 'eui',
        themeScope: '.x',
        theme: { colors: { ink: lightDark('#111', '#eee') } },
        variations: { muted: { colors: { accent: '#0077cc' } } as never },
      })
    ).toThrow(/Variation "muted": unknown path "colors\/accent"/);
  });

  it('throws when a media variation declaration has extra keys', () => {
    expect(() =>
      createDistillery({
        prefix: 'eui',
        themeScope: '.x',
        theme: { colors: { ink: '#111' } },
        variations: {
          highContrast: {
            media: '(prefers-contrast: more)',
            variation: { colors: { ink: '#000' } },
            extra: true,
          } as never,
        },
      })
    ).toThrow(/cannot include keys "extra"/);
  });

  it('throws when a media query is empty', () => {
    expect(() =>
      createDistillery({
        prefix: 'eui',
        themeScope: '.x',
        theme: { colors: { ink: '#111' } },
        variations: {
          highContrast: {
            media: '   ',
            variation: { colors: { ink: '#000' } },
          },
        },
      })
    ).toThrow(/empty media query/);
  });

  it('throws when a named variation diverges a ScaleToken', () => {
    expect(() =>
      createDistillery({
        prefix: 'eui',
        themeScope: '.x',
        theme: { gap: cq('8px', '2cqi') },
        variations: { dense: { gap: cq('4px', '1cqi') } },
      })
    ).toThrow(/ScaleToken at "gap" disagrees with the base/);
  });
});

describe('tokenTreeDts', () => {
  it('emits a nested interface from a derived token tree', () => {
    const { tokens } = createDistillery({
      prefix: 'eui',
      themeScope: '.x',
      theme: {
        colors: { ink: lightDark('#111', '#eee') },
        gap: cq('8px', '2cqi'),
      },
    });
    expect(tokenTreeDts('DemoTokens', tokens)).toBe(
      [
        'interface DemoTokens {',
        '  readonly colors: {',
        '    readonly ink: CssInterpolable;',
        '  };',
        '  readonly gap: CssInterpolable;',
        '}',
      ].join('\n')
    );
  });
});
