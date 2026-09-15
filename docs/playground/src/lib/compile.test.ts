/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { describe, expect, it } from 'vitest';

import { snippets } from '../examples/snippets';

import { compilePlayground } from './compile';
import { createDemoDistillery } from './demo_environment';

const expectOk = (result: ReturnType<typeof compilePlayground>) => {
  if (!result.ok) {
    throw new Error(
      `expected ok, got ${result.error.stage}: ${result.error.message}`
    );
  }
  return result;
};

describe('compilePlayground', () => {
  it('renders the emotion class into both the preview and the readable CSS', () => {
    const source = 'const c = css`color: red;`;\nreturn c.toString();';
    const result = expectOk(compilePlayground(source, 'emotion'));

    expect(result.previewHtml).not.toBe('');
    expect(result.readableCss).toContain(`.${result.previewHtml}`);
    expect(result.readableCss).toContain('color:red');
  });

  it('emits distinct compact and readable class names for the same styles', () => {
    const source = 'const c = css`padding: 16px;`;\nreturn c.toString();';
    const result = expectOk(compilePlayground(source, 'emotion'));

    expect(result.readableCss).not.toBe('');
    expect(result.compactCss).not.toBe('');
    expect(result.compactCss).not.toEqual(result.readableCss);
    expect(result.compactCss).toContain('padding:16px');
  });

  it('resolves theme tokens to a var reference and a :host declaration', () => {
    const source =
      'const c = css`color: ${tokens.color.accent};`;\nreturn c.toString();';
    const result = expectOk(compilePlayground(source, 'emotion'));

    expect(result.readableCss).toContain('var(--dstl-color-accent)');
    expect(result.readableCss).toContain(':host{');
    expect(result.readableCss).toContain('--dstl-color-accent:');
  });

  it('resolves native module handles via cn into the readable CSS', () => {
    const source = [
      "const m = createStyleModule('demo', ({ css }) => ({",
      '  root: css`color: red;`,',
      '}));',
      'return cn(m.handles.root);',
    ].join('\n');
    const result = expectOk(compilePlayground(source, 'native'));

    expect(result.previewHtml).not.toBe('');
    expect(result.readableCss).toContain(`.${result.previewHtml}`);
  });

  it('reports transform-stage errors for invalid syntax', () => {
    const result = compilePlayground('const = ;', 'emotion');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.stage).toBe('transform');
    }
  });

  it('reports evaluate-stage errors for runtime failures', () => {
    const result = compilePlayground('return missing.value;', 'emotion');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.stage).toBe('evaluate');
    }
  });

  it('compiles every shipped snippet without error', () => {
    for (const mode of ['emotion', 'native'] as const) {
      for (const snippet of snippets[mode]) {
        const result = compilePlayground(snippet.source, mode);
        expect(result.ok, `${mode}/${snippet.id}`).toBe(true);
      }
    }
  });

  it('omits an uncollected variant from the artifact that the stylesheet keeps', () => {
    for (const mode of ['emotion', 'native'] as const) {
      const snippet = snippets[mode].find((item) => item.id === 'tree-shake');
      expect(snippet, mode).toBeDefined();
      const result = expectOk(compilePlayground(snippet?.source ?? '', mode));

      expect(result.readableCss).toContain('#C61E25');
      expect(result.artifactCss).not.toContain('#C61E25');
      expect(result.artifactBytes).toBeLessThan(result.stylesheetBytes);
      if (mode === 'native') {
        expect(result.readableCss).toContain('chip-tone-loud');
      }
    }
  });

  it('collects emotion handles that stringify into the returned markup', () => {
    const source = [
      'const used = css`color: red;`;',
      'const unused = css`color: blue;`;',
      'return `<div class="${used}"></div>`;',
    ].join('\n');
    const result = expectOk(compilePlayground(source, 'emotion'));

    expect(result.readableCss).toContain('color:red');
    expect(result.readableCss).toContain('color:blue');
    expect(result.artifactCss).toContain('color:red');
    expect(result.artifactCss).not.toContain('color:blue');
  });

  it('assigns compact artifact names after collection completes', () => {
    const source = [
      "const zebra = createStyleModule('zebra', ({ css }) => ({",
      '  root: css`color: red;`,',
      '}));',
      "const apple = createStyleModule('apple', ({ css }) => ({",
      '  root: css`color: blue;`,',
      '}));',
      'return `<div class="${cn(zebra.handles.root)}"></div><span class="${cn(apple.handles.root)}"></span>`;',
    ].join('\n');
    const result = expectOk(compilePlayground(source, 'native'));

    const distillery = createDemoDistillery();
    const zebra = distillery.createStyleModule('zebra', ({ css }) => ({
      root: css`
        color: red;
      `,
    }));
    const apple = distillery.createStyleModule('apple', ({ css }) => ({
      root: css`
        color: blue;
      `,
    }));
    const collector = distillery.artifactCollector('compact');
    collector.useHandles([zebra.handles.root]);
    collector.useHandles([apple.handles.root]);
    expect(result.artifactCss).toBe(distillery.renderStyles(collector));

    const early = distillery.artifactCollector('compact');
    early.useHandles([zebra.handles.root]);
    const earlyResolver = early.createResolver();
    early.useHandles([apple.handles.root]);
    expect(() => distillery.renderStyles(early, earlyResolver)).toThrow(
      /No compact class name registered/
    );
  });
});
