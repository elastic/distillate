/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  cq,
  createDistillery,
  type Distillery,
  type DistilleryEnvironment,
  isCssToken,
  isScaleToken,
  lightDark,
  type TokensOf,
} from '@elastic/distillate';

const sansStack = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const monoStack = 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace';

const demoTheme = {
  color: {
    text: lightDark('#1B1E28', '#E6E8F0'),
    surface: lightDark('#FFFFFF', '#141A27'),
    subtle: lightDark('#5A6472', '#9AA4B6'),
    border: lightDark('#DCE2EA', '#2B3242'),
    primary: lightDark('#0B64DD', '#61A2FF'),
    accent: lightDark('#BC1E70', '#EE72A6'),
    accentSecondary: lightDark('#008B87', '#16C5C0'),
    success: lightDark('#008A5E', '#24C292'),
    warning: '#FACB3D',
    danger: lightDark('#C61E25', '#F6726A'),
  },
  space: {
    xs: cq('4px', '1cqi'),
    s: cq('8px', '2cqi'),
    m: cq('16px', '4cqi'),
    l: cq('24px', '6cqi'),
  },
  radius: {
    s: cq('6px', '6px'),
    m: cq('12px', '12px'),
  },
  font: {
    sans: sansStack,
    mono: monoStack,
  },
};

export type DemoTokens = TokensOf<typeof demoTheme>;

const demoBind = {
  prefix: 'dstl',
  themeScope: ':host',
  theme: demoTheme,
  dev: true,
  variations: {
    muted: {
      color: {
        accent: '#0077cc',
      },
    },
    highContrast: {
      media: '(prefers-contrast: more)',
      variation: {
        color: {
          text: lightDark('#000', '#fff'),
          surface: lightDark('#fff', '#000'),
        },
      },
    },
  },
};

const catalogDistillery = createDistillery(demoBind);

export const demoTokens: DemoTokens = catalogDistillery.tokens;
export const demoEnvironment: DistilleryEnvironment<DemoTokens> =
  catalogDistillery.environment;

export const createDemoDistillery = (): Distillery<DemoTokens> =>
  createDistillery(demoBind);

/** A single entry in the token catalog table. */
export type DemoTokenCatalogEntry =
  | {
      readonly kind: 'theme';
      readonly access: string;
      readonly cssVar: string;
      readonly light: string;
      readonly dark: string;
    }
  | {
      readonly kind: 'scale';
      readonly access: string;
      readonly value: string;
      readonly cq: string;
    };

const catalogFromTokens = (
  tokens: object,
  prefix = 'tokens'
): DemoTokenCatalogEntry[] => {
  const out: DemoTokenCatalogEntry[] = [];
  const walk = (node: object, access: string): void => {
    for (const [key, child] of Object.entries(
      node as Record<string, unknown>
    )) {
      const next = `${access}.${key}`;
      if (isCssToken(child)) {
        const def = demoEnvironment.themeVars[child.path];
        out.push({
          kind: 'theme',
          access: next,
          cssVar: child.cssVar,
          light: def?.light ?? '',
          dark: def?.dark ?? '',
        });
      } else if (isScaleToken(child)) {
        out.push({
          kind: 'scale',
          access: next,
          value: child.value,
          cq: child.cq,
        });
      } else if (child && typeof child === 'object') {
        walk(child, next);
      } else {
        throw new Error(`Unknown token type at ${next}`);
      }
    }
  };
  walk(tokens, prefix);
  return out;
};

/** Flat catalog of all demo tokens, in group/key insertion order. */
export const demoTokenCatalog: readonly DemoTokenCatalogEntry[] =
  catalogFromTokens(demoTokens);
