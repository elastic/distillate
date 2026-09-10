/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *	http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { describe, expect, it } from 'vitest';

import {
  createDemoDistillery,
  demoTokenCatalog,
  demoTokens,
} from './demo_environment';

describe('demoTokenCatalog', () => {
  it('lists every playground token with its resolved values', () => {
    const byAccess = new Map(
      demoTokenCatalog.map((entry) => [entry.access, entry])
    );
    expect(byAccess.size).toBe(demoTokenCatalog.length);

    const accent = byAccess.get('tokens.color.accent');
    expect(accent).toMatchObject({
      kind: 'theme',
      cssVar: demoTokens.color.accent.cssVar,
      light: '#BC1E70',
      dark: '#EE72A6',
    });
    expect(byAccess.get('tokens.color.primary')).toMatchObject({
      kind: 'theme',
      light: '#0B64DD',
      dark: '#61A2FF',
    });
    expect(byAccess.get('tokens.color.accentSecondary')).toMatchObject({
      kind: 'theme',
      light: '#008B87',
      dark: '#16C5C0',
    });
    expect(byAccess.get('tokens.color.success')).toMatchObject({
      kind: 'theme',
      light: '#008A5E',
      dark: '#24C292',
    });
    expect(byAccess.get('tokens.color.warning')).toMatchObject({
      kind: 'theme',
      light: '#FACB3D',
      dark: '#FACB3D',
    });
    expect(byAccess.get('tokens.color.danger')).toMatchObject({
      kind: 'theme',
      light: '#C61E25',
      dark: '#F6726A',
    });

    const space = byAccess.get('tokens.space.s');
    expect(space).toMatchObject({
      kind: 'scale',
      value: demoTokens.space.s.value,
      cq: demoTokens.space.s.cq,
    });

    expect(demoTokenCatalog.map((entry) => entry.access)).toEqual([
      ...Object.keys(demoTokens.color).map((key) => `tokens.color.${key}`),
      ...Object.keys(demoTokens.space).map((key) => `tokens.space.${key}`),
      ...Object.keys(demoTokens.radius).map((key) => `tokens.radius.${key}`),
      ...Object.keys(demoTokens.font).map((key) => `tokens.font.${key}`),
    ]);
  });
});

describe('demo theme layers', () => {
  const renderDemo = (options?: {
    theme?: string;
    alternates?: readonly { theme: string; selector?: string }[];
  }): string => {
    const distillery = createDemoDistillery();
    distillery.createStyleModule('swatch', (t) => ({
      root: t.css`
        color: ${t.tokens.color.accent};
        background: ${t.tokens.color.surface};
      `,
    }));
    return distillery.renderStyles(
      distillery.stylesheetCollector(),
      undefined,
      options
    );
  };

  it('keeps base-only output free of declared overlays', () => {
    const css = renderDemo();
    expect(css).toContain('--dstl-color-accent:light-dark(#BC1E70,#EE72A6)');
    expect(css).not.toContain('#0077cc');
    expect(css).not.toContain('prefers-contrast');
  });

  it('flattens amsterdam into :host', () => {
    const css = renderDemo({ theme: 'amsterdam' });
    expect(css).toContain(':host{');
    expect(css).toContain('--dstl-color-accent:#0077cc');
    expect(css).not.toContain('data-eui-theme');
  });

  it('emits amsterdam as a :host() alternate', () => {
    const css = renderDemo({
      alternates: [
        { theme: 'amsterdam', selector: '[data-eui-theme="amsterdam"]' },
      ],
    });
    expect(css).toContain(
      ':host([data-eui-theme="amsterdam"]){--dstl-color-accent:#0077cc}'
    );
  });

  it('wraps highContrast in its media query under :host', () => {
    const css = renderDemo({ theme: 'highContrast' });
    expect(css).toContain(
      '@media (prefers-contrast:more){:host{--dstl-color-surface:light-dark(#fff,#000)}}'
    );
    expect(css).not.toContain('--dstl-color-text:light-dark(#000,#fff)');
  });
});
