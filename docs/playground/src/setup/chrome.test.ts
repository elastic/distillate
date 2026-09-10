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
