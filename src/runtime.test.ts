/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { createDistillery } from './engine';

const createFixture = () =>
  createDistillery({
    prefix: 'eui',
    themeScope: '.eui-view',
    theme: {
      colors: {
        ink: '#111',
        inkStrong: '#000',
      },
    },
  });

describe('renderStyles readable var substitution', () => {
  it('rewrites authored readable names to compact names', () => {
    const distillery = createFixture();
    const demo = distillery.createStyleModule('demo', (t) => ({
      root: t.css`
        color: ${t.tokens.colors.ink};
        border-color: var(--eui-colors-inkStrong, var(--eui-colors-ink));
        --eui-colors-ink: red;
        --eui-colors-inky: blue;
        --eui-colors-ink-x: green;
        content: '--eui-colors-ink';
        /* --eui-colors-ink */
      `,
    }));
    const collector = distillery.artifactCollector('compact');
    collector.use(demo);
    collector.useThemeVar('colors/inkStrong');
    const resolver = collector.createResolver();
    const ink = resolver.cssVar('colors/ink');
    const strong = resolver.cssVar('colors/inkStrong');

    const css = distillery.renderStyles(collector, resolver);

    expect(css).toContain(`color:var(${ink})`);
    expect(css).toContain(`border-color:var(${strong},var(${ink}))`);
    expect(css).toContain(`${ink}:red`);
    expect(css).toContain('--eui-colors-inky:blue');
    expect(css).toContain('--eui-colors-ink-x:green');
    expect(css).toContain("content:'--eui-colors-ink'");
    expect(css).not.toMatch(/--eui-colors-ink(?![-yS'])/);
  });

  it('leaves readable output unchanged', () => {
    const distillery = createFixture();
    const demo = distillery.createStyleModule('demo', (t) => ({
      root: t.css`
        color: var(--eui-colors-inkStrong);
        background: ${t.tokens.colors.ink};
      `,
    }));
    const collector = distillery.artifactCollector('readable');
    collector.use(demo);

    expect(distillery.renderStyles(collector)).toContain(
      '{color:var(--eui-colors-inkStrong);background:var(--eui-colors-ink)}'
    );
  });
});

describe('StylesCollector dep caching', () => {
  it('reuses finalized deps until the collection changes', () => {
    const distillery = createFixture();
    const demo = distillery.createStyleModule('demo', (t) => ({
      first: t.css`
        color: ${t.tokens.colors.ink};
      `,
      second: t.css`
        color: ${t.tokens.colors.inkStrong};
      `,
    }));
    const collector = distillery.artifactCollector('readable');
    collector.useHandles([demo.handles.first]);

    const before = collector.collectedThemeDeps;
    expect(collector.collectedThemeDeps).toBe(before);
    expect([...before]).toEqual(['colors/ink']);

    collector.useHandles([demo.handles.second]);

    expect(collector.collectedThemeDeps).not.toBe(before);
    expect([...collector.collectedThemeDeps].sort()).toEqual([
      'colors/ink',
      'colors/inkStrong',
    ]);
  });
});
