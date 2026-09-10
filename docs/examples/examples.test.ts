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

import { run as runStylesheet } from './01-stylesheet';
import { run as runArtifact } from './02-artifact';
import { run as runVariants } from './03-variants';
import { run as runEmotion } from './04-emotion';
import { run as runVarInvariant } from './05-var-invariant';
import { run as runPayload } from './06-payload';

describe('examples', () => {
  it('emits a readable stylesheet for every registered module', () => {
    expect(runStylesheet()).toBe(
      '.eui-view{--eui-colors-ink:light-dark(#111,#eee)}.demo-root{color:var(--eui-colors-ink);padding:8px}'
    );
  });

  it('tree-shakes unused handles from a compact artifact', () => {
    const css = runArtifact();
    expect(css).toBe(
      '.eui-view{--a:light-dark(#111,#eee)}.a{color:var(--a);padding:8px}'
    );
    expect(css).not.toContain('accent');
  });

  it('keeps variants off always-on collection until a handle is named', () => {
    const { withoutVariants, withLoud } = runVariants();
    expect(withoutVariants).not.toContain('toned-tone');
    expect(withLoud).toContain('.toned-tone-loud');
    expect(withLoud).not.toContain('toned-tone-calm');
  });

  it('stringifies emotion css to a readable class and ships nested rules', () => {
    const { className, stylesheet } = runEmotion();
    expect(className).toMatch(/^css-[0-9a-z]{14}-root$/);
    const readable = className.replace(/-root$/, '');
    expect(stylesheet).toContain(
      `.${readable}-root{color:var(--eui-colors-ink)}`
    );
    expect(stylesheet).toContain(
      `.${readable}-root:hover{color:var(--eui-colors-accent)}`
    );
    expect(stylesheet).toContain(
      `@media (min-width:600px){.${readable}-root{padding:8px}}`
    );
  });

  it('passes the var-invariant check on a complete stylesheet', () => {
    const { css, violationCount } = runVarInvariant();
    expect(css).toContain('var(--eui-colors-ink)');
    expect(violationCount).toBe(0);
  });

  it('ships a compact artifact that is substantially smaller than the full stylesheet', () => {
    const { stylesheet, artifact, stylesheetBytes, artifactBytes } =
      runPayload();
    expect(stylesheet).toContain('panel-tone-loud');
    expect(stylesheet).toContain('panel-tone-danger');
    expect(stylesheet).toContain('panel-footer');
    expect(stylesheet).toContain('#06c');
    expect(artifact).not.toContain('#06c');
    expect(artifactBytes).toBeLessThan(stylesheetBytes);
    const ratio = artifactBytes / stylesheetBytes;
    expect(ratio).toBeGreaterThan(0.05);
    expect(ratio).toBeLessThan(0.4);
  });
});
