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
  assertVarRefsHaveDeclarations,
  collectDeclaredCustomProperties,
  collectReferencedCustomProperties,
  findVarRefViolations,
} from './var_invariant';

describe('var-ref invariant helper', () => {
  it('passes when every reference has a matching declaration', () => {
    const css =
      '.aui{--aui-colors-text:#1d2a3e;--a:#fff}.x{color:var(--aui-colors-text);background:var(--a)}';
    expect(findVarRefViolations(css)).toEqual([]);
    expect(() => assertVarRefsHaveDeclarations(css)).not.toThrow();
  });

  it('flags a reference with no declaration', () => {
    // `--missing` is referenced but never declared. The helper should
    // flag it with surrounding context so a failing test points at the
    // offending block.
    const css = '.aui{--a:#fff}.x{color:var(--missing)}';
    const violations = findVarRefViolations(css);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.reference).toBe('--missing');
    expect(violations[0]?.context).toContain('var(--missing');

    expect(() => assertVarRefsHaveDeclarations(css)).toThrow(
      /1 var\(\.\.\.\) reference\(s\) without a matching declaration/
    );
  });

  it('matches both compact and readable names without distinguishing', () => {
    const css = '.aui{--a:1;--aui-colors-text:#000}.x{color:var(--a)}';
    expect(collectDeclaredCustomProperties(css)).toEqual(
      new Set(['--a', '--aui-colors-text'])
    );
    expect(collectReferencedCustomProperties(css)).toEqual(['--a']);
  });

  it('allows whitespace after var(', () => {
    const css = '.aui{--a:#fff}.x{color:var( --a )}';
    expect(findVarRefViolations(css)).toEqual([]);
    expect(collectReferencedCustomProperties(css)).toEqual(['--a']);
  });

  it('does not read a selector modifier as a declaration', () => {
    // `.button--active:hover` is a selector, not a declaration of `--active`,
    // so the reference below is genuinely undeclared.
    const css = '.button--active:hover{color:var(--active)}';

    expect(collectDeclaredCustomProperties(css)).toEqual(new Set());
    expect(findVarRefViolations(css)).toHaveLength(1);
    expect(findVarRefViolations(css)[0]?.reference).toBe('--active');
  });

  it('accepts declarations after a brace, a semicolon, and a comment', () => {
    const css =
      '@media (min-width:0){.x{--a:1;/* c */--b:2}}.y{color:var(--a);background:var(--b)}';

    expect(collectDeclaredCustomProperties(css)).toEqual(
      new Set(['--a', '--b'])
    );
    expect(findVarRefViolations(css)).toEqual([]);
  });

  it('ignores declarations and references inside strings and comments', () => {
    const css =
      '.x{content:"var(--missing)";color:var(--a)}/* --ghost:1; var(--ghost) */.aui{--a:#fff}';
    expect(collectDeclaredCustomProperties(css)).toEqual(new Set(['--a']));
    expect(collectReferencedCustomProperties(css)).toEqual(['--a']);
    expect(findVarRefViolations(css)).toEqual([]);
  });
  it('ignores a var suffix inside a longer function name', () => {
    // `myvar(` is some other function; `--missing` is its argument, not a
    // custom-property reference, so reporting it would be a false violation.
    const css = '.x{--expr:myvar(--missing)}';

    expect(collectReferencedCustomProperties(css)).toEqual([]);
    expect(findVarRefViolations(css)).toEqual([]);

    // A real reference in the same shape is still caught.
    expect(
      findVarRefViolations('.x{--expr:myvar(--a);color:var(--missing)}')
    ).toHaveLength(1);
  });
});
