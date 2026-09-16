/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { distillery, ui } from './chrome';

describe('playground chrome stylesheet', () => {
  const css = distillery.renderStyles(distillery.stylesheetCollector());

  it('emits theme vars on :root with the playground prefix, not the snippet prefix', () => {
    expect(css).toContain(':root{');
    expect(css).toContain('--pg-color-accent:');
    expect(css).not.toContain('--dstl-');
  });

  it('emits readable chrome classes and nested chrome selectors', () => {
    expect(css).toContain(`.${ui.handles.shell.readableName}{`);
    expect(css).toContain(
      `.${ui.handles.segmented.readableName} button[aria-pressed='true']`
    );
    expect(css).toContain('@media (min-width:800px)');
    expect(css).toContain('grid-area:source');
    expect(css).toContain('grid-area:output');
    expect(css).toContain(`.${ui.handles.dockOutput.readableName}{`);
    expect(css).toContain('box-sizing:border-box');
    expect(css).toMatch(
      new RegExp(
        `\\.${ui.handles.editor.readableName} \\[data-pg-monaco\\]\\{[^}]*background:var\\(--pg-color-code\\)`
      )
    );
    expect(css).toContain('@media (min-width:1100px)');
    expect(css).toMatch(
      new RegExp(
        `\\.${ui.handles.cssOut.readableName}\\{[^}]*background:var\\(--pg-color-bg\\)`
      )
    );
    expect(css).toContain(`.${ui.handles.cssStats.readableName}{`);
    expect(css).toContain(`.${ui.handles.tokenTable.readableName} code{`);
    expect(css).toContain(`.${ui.handles.swatch.readableName}[data-active]{`);
    expect(css).toContain(`.${ui.handles.dockSource.readableName}{`);
  });
});
