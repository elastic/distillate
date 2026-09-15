/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { describe, expect, it } from 'vitest';

import {
  type FlattenedEntry,
  type FlattenedMedia,
  type FlattenedRule,
  flattenTemplate,
  hasNestedSyntax,
} from './nesting';
import type { StyleHandle } from './styles';
import { themeToken } from './tokens';

// Minimal stand-ins: the flattener only checks `kind === 'handle'` and marker
// `__kind`, never the full shape.
const fakeHandle = (name: string): StyleHandle =>
  ({ kind: 'handle', readableName: name, key: name }) as unknown as StyleHandle;

const fakeMarker = () =>
  ({
    __kind: 'local-var-override-marker',
    groupId: 'g',
    overrides: [],
  }) as const;

const self = (strings: readonly string[], values: readonly unknown[] = []) =>
  flattenTemplate(strings, values, { mode: 'self' });

const asRule = (entry: FlattenedEntry | undefined): FlattenedRule => {
  if (!entry || entry.kind !== 'rule') {
    throw new Error('expected a flattened rule');
  }
  return entry;
};

const asMedia = (entry: FlattenedEntry | undefined): FlattenedMedia => {
  if (!entry || entry.kind !== 'media') {
    throw new Error('expected a flattened media');
  }
  return entry;
};

describe('hasNestedSyntax', () => {
  it('is false for brace-free templates and true otherwise', () => {
    expect(hasNestedSyntax(['color: red;'])).toBe(false);
    expect(hasNestedSyntax(['&:hover { color: red }'])).toBe(true);
    expect(hasNestedSyntax(['content: "{"'])).toBe(true);
  });
});

describe('flattenTemplate — sentinel round-trips', () => {
  it('lands value-position tokens in the correct block by object identity', () => {
    const a = themeToken('colors/a', '--a');
    const b = themeToken('colors/b', '--b');
    const flat = self(['color:', ';&:hover{width:', '}'], [a, b]);

    expect(flat.self?.values).toEqual([a]);
    expect(flat.self?.values[0]).toBe(a);
    expect(flat.nested).toHaveLength(1);
    const rule = asRule(flat.nested[0]);
    expect(rule.slice.values[0]).toBe(b);
    expect(rule.alternatives).toEqual([['&:hover']]);
  });

  it('preserves statement-position markers as whole values', () => {
    const marker = fakeMarker();
    const flat = self(['color:red;', ';&:hover{color:blue}'], [marker]);
    expect(flat.self?.values[0]).toBe(marker);
  });
});

describe('flattenTemplate — selector reconstruction', () => {
  it('captures interpolated handles by identity in selector parts', () => {
    const sibling = fakeHandle('sibling');
    const rule = asRule(self(['& ', '{color:red}'], [sibling]).nested[0]);
    expect(rule.alternatives[0]?.[0]).toBe('& ');
    expect(rule.alternatives[0]?.[1]).toBe(sibling);
  });

  it('absorbs a leading dot before an interpolated handle', () => {
    const sibling = fakeHandle('sibling');
    const rule = asRule(self(['& .', '{color:red}'], [sibling]).nested[0]);
    // The `.` is absorbed; the handle carries its own class identity.
    expect(rule.alternatives[0]).toEqual(['& ', sibling]);
  });

  it('splits comma cross-products into separate alternatives', () => {
    const rule = asRule(self(['&:hover, &:focus { color: red }']).nested[0]);
    expect(rule.alternatives).toEqual([['&:hover'], ['&:focus']]);
  });

  it('rejects non-handle objects in selector position', () => {
    const token = themeToken('colors/a', '--a');
    expect(() => self(['', ' & { color: red }'], [token])).toThrow(
      /selector position/
    );
  });
});

describe('flattenTemplate — media', () => {
  it('captures bare in-media declarations as the media self slice', () => {
    const media = asMedia(
      self(['color:red;@media (min-width:600px){color:blue;padding:0}'])
        .nested[0]
    );
    expect(media.query).toBe('(min-width:600px)');
    expect(media.self).toBeDefined();
    expect(media.rules).toHaveLength(0);
  });

  it('captures nested selectors inside media as rules', () => {
    const media = asMedia(
      self(['@media (min-width:600px){&:hover{color:blue}}']).nested[0]
    );
    expect(media.self).toBeUndefined();
    expect(media.rules[0]?.alternatives).toEqual([['&:hover']]);
  });

  it('inlines string and number interpolations into the query', () => {
    const fromString = asMedia(
      self(['@media (min-width:', '){color:red}'], ['600px']).nested[0]
    );
    expect(fromString.query).toBe('(min-width:600px)');
    const fromNumber = asMedia(
      self(['@media (min-width:', 'px){color:red}'], [600]).nested[0]
    );
    expect(fromNumber.query).toBe('(min-width:600px)');
  });

  it('rejects non-scalar interpolations in the query', () => {
    const token = themeToken('colors/a', '--a');
    expect(() => self(['@media (min-width:', '){color:red}'], [token])).toThrow(
      /strings or numbers only/
    );
  });

  it('leaves an at-rule-looking path inside an unquoted url alone', () => {
    // Canonicalizing `@MEDIA` to `@media` must not reach into a url token: the
    // path is case-sensitive and this one is not an at-rule.
    expect(
      self(['background:url(/icons/@MEDIA/logo.svg)']).self?.strings
    ).toEqual(['background:url(/icons/@MEDIA/logo.svg);']);
  });

  it('leaves an `@`-word that merely starts with `media` alone', () => {
    // Case-canonicalizing `@MEDIA` must match the whole at-rule name. A
    // prefix match rewrites `@MEDIA-PRINT` to `@media-PRINT`, and inside
    // parentheses — where the structure scan does not look for at-rules — that
    // reaches a declaration value and silently changes it.
    expect(self(['--x:foo(@MEDIA-PRINT)']).self?.strings).toEqual([
      '--x:foo(@MEDIA-PRINT);',
    ]);
  });

  it('accepts @MEDIA case-insensitively', () => {
    const media = asMedia(
      self(['@MEDIA (min-width:600px){color:red}']).nested[0]
    );
    expect(media.query).toBe('(min-width:600px)');
  });
});

describe('flattenTemplate — scope rejections', () => {
  it.each([
    ['@supports', '@supports (display:grid){&{color:red}}'],
    ['@container', '@container (min-width:0){&{color:red}}'],
    ['@keyframes', '@keyframes spin{from{opacity:0}to{opacity:1}}'],
  ])('rejects %s', (_label, css) => {
    expect(() => self([css])).toThrow(/@media/);
  });

  it('rejects @media nested inside @media', () => {
    expect(() =>
      self(['@media screen{@media (min-width:0){&{color:red}}}'])
    ).toThrow(/Nested @media/);
  });

  it('rejects unbalanced braces', () => {
    expect(() => self(['&:hover { color: red'])).toThrow(/unbalanced/);
  });

  it('rejects reserved sentinel patterns in authored text', () => {
    expect(() => self(['__dstl0__ { color: red }'])).toThrow(/reserved/);
    expect(() => self(['content: "x"; --dstl-9: 0;'])).toThrow(/reserved/);
  });

  it('rejects handles interpolated into declaration position', () => {
    const handle = fakeHandle('h');
    expect(() => self(['color: ', ';&:hover{color:red}'], [handle])).toThrow(
      /declaration value/
    );
  });
});

describe('flattenTemplate — global mode', () => {
  const global = (
    strings: readonly string[],
    values: readonly unknown[] = []
  ) => flattenTemplate(strings, values, { mode: 'global' });

  it('produces absolute-selector rules with no self', () => {
    const flat = global(['.brand{color:red;&:hover{color:blue}}']);
    expect(flat.self).toBeNull();
    const selectors = flat.nested
      .filter((entry): entry is FlattenedRule => entry.kind === 'rule')
      .flatMap((entry) => entry.alternatives);
    expect(selectors).toContainEqual(['.brand']);
    expect(selectors).toContainEqual(['.brand:hover']);
  });

  it('rejects top-level declarations and top-level &', () => {
    expect(() => global(['color: red;'])).toThrow(/top-level declarations/);
    expect(() => global(['&:hover { color: red }'])).toThrow(/top level/);
  });
});

describe('flattenTemplate — tolerance', () => {
  it('handles quoted braces without treating them as blocks', () => {
    const rule = asRule(self(['&::before{content:"{"}']).nested[0]);
    expect(rule.slice.strings.join('')).toContain('content:"{"');
  });

  it('handles braces inside url() via paren tracking', () => {
    expect(() =>
      self(['background:url(a{b});&:hover{color:red}'])
    ).not.toThrow();
  });
});
