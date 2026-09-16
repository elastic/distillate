/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { formatCss } from './format_css';

describe('formatCss', () => {
  it('expands a minified rule into indented lines', () => {
    expect(formatCss('.a{color:red;padding:8px}')).toBe(
      ['.a {', '  color:red;', '  padding:8px;', '}'].join('\n')
    );
  });

  it('nests at-rule blocks', () => {
    const input = '@media (min-width:400px){.a{color:red}}';
    expect(formatCss(input)).toBe(
      [
        '@media (min-width:400px) {',
        '  .a {',
        '    color:red;',
        '  }',
        '}',
      ].join('\n')
    );
  });

  it('leaves braces inside string literals untouched', () => {
    expect(formatCss('.a{content:"}"}')).toBe(
      ['.a {', '  content:"}";', '}'].join('\n')
    );
  });

  it('returns an empty string for empty input', () => {
    expect(formatCss('')).toBe('');
  });
});
