/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { testCorpus } from '@rmenke/css-tokenizer-tests';
import { compile, type Element } from 'stylis';
import { describe, expect, it } from 'vitest';

import { scanCss } from './css_scan';
import { minifyCss } from './minify';
import {
  collectDeclaredCustomProperties,
  collectReferencedCustomProperties,
  findVarRefViolations,
} from './var_invariant';

/**
 * Every CSS shape these passes have got wrong, plus the traps around them.
 * The named entries are the ones review found one at a time; the rest are the
 * neighbours of each — if a scanner mishandles one member of a family it
 * usually mishandles the others, and the properties below check the family.
 */
const CORPUS: readonly {
  label: string;
  css: string;
  /**
   * Why the stylis oracle cannot judge this entry. stylis does not tokenize
   * comments inside a function's parentheses, so it reports a comment there
   * unchanged; per CSS Syntax Level 3 a comment is consumed everywhere except
   * inside a string or a url token, so stripping it is correct and the oracle
   * is the one that is wrong. The remaining properties still apply.
   */
  oracleBlind?: string;
}[] = [
  // Found in review.
  { label: 'selector modifier', css: '.button--active:hover{color:var(--x)}' },
  { label: 'descendant pseudo', css: '.menu :hover{color:red}' },
  { label: 'escaped semicolon', css: String.raw`.a{--x:foo\;}` },
  { label: 'comment in url', css: '.a{background:url(/img/*d*/i.svg)}' },
  { label: 'at-rule in url', css: '.a{background:url(/i/@MEDIA/l.svg)}' },
  { label: 'var suffix', css: '.x{--expr:myvar(--y);color:var(--expr)}' },
  {
    label: 'url suffix',
    css: '.a{background:myurl(/i/*k*/l.svg)}',
    oracleBlind: 'stylis keeps comments inside parentheses',
  },

  // Strings that contain syntax.
  { label: 'brace in string', css: '.a{content:";}"}' },
  { label: 'comment open in string', css: '.a{content:"/*"}' },
  { label: 'var in string', css: '.a{content:"var(--nope)"}' },
  { label: 'escaped quote', css: '.a{content:"a\\"b"}' },

  // Opaque spans whose contents would be reformatted if they were read as
  // code. Each carries interior whitespace on purpose: a corpus entry with no
  // whitespace cannot detect a scanner that mis-classifies it, because
  // minification has nothing to do either way.
  {
    label: 'spaced syntax in string',
    css: '.a { content: " ; } " ; color : red }',
  },
  { label: 'spaced comment in string', css: '.a { content: " /* x */ " }' },
  { label: 'spaced url in string', css: '.a { content: " url( a ) " }' },
  { label: 'spaced escape', css: String.raw`.a { --x: foo\; ; color : red }` },
  {
    label: 'spaced url token',
    css: '.a { background: url( /i/ *k* /l.svg ) }',
  },

  // Urls, quoted and not.
  {
    label: 'data uri',
    css: '.a{background:url(data:image/svg+xml;base64,AA)}',
  },
  { label: 'quoted url', css: '.a{background:url("/i/*k*/l.svg")}' },
  { label: 'url with spaces', css: '.a{background:url( /i/l.svg )}' },
  { label: 'uppercase url fn', css: '.a{background:URL(/i/@MEDIA/l.svg)}' },

  // Escapes in selectors and values.
  { label: 'escaped colon selector', css: String.raw`.b\:hover{color:red}` },
  { label: 'escaped comma value', css: String.raw`.a{--x:a\,b;color:red}` },
  { label: 'escaped brace value', css: String.raw`.a{--x:a\{b}` },

  // At-rules and nesting.
  { label: 'media block', css: '@media (min-width:0){.a{color:red}}' },
  { label: 'media descendant', css: '@media (min-width:0){.a :hover{top:0}}' },
  { label: 'nested media', css: '@media a{@media b{.a{color:red}}}' },
  { label: 'supports block', css: '@supports (display:grid){.a{color:red}}' },

  // Selectors that look like declarations.
  { label: 'is() list', css: '.a:is(.b, .c){color:red}' },
  { label: 'attribute brace', css: '.a[data-x="{"]{color:red}' },
  { label: 'attribute semicolon', css: '.a[data-x=";"]{color:red}' },

  // Declarations that look like selectors.
  { label: 'custom prop colon', css: '.a{--x:a:b}' },
  { label: 'spaced colon', css: '.a{color : red}' },
  { label: 'media spaced colon', css: '@media (min-width : 0){.a{top:0}}' },

  // What the runtime actually emits.
  {
    label: 'theme scope',
    css: '.aui{--aui-a:#fff;--aui-b:light-dark(#000,#fff)}.x{color:var(--aui-a)}',
  },
  {
    label: 'theme value url',
    css: '.aui{--aui-bg:url(/i/b.png)}.x{background:var(--aui-bg)}',
  },
  {
    label: 'theme value quoted',
    css: `.aui{--aui-q:"a;b"}.x{content:var(--aui-q)}`,
  },

  // Value whitespace that separates tokens, which the oracle has to keep
  // telling apart from whitespace that is noise.
  { label: 'value separator', css: '.a { margin: 0 auto; }' },
  { label: 'multi-value separator', css: '.a { font: bold 12px/1.5 serif; }' },
  { label: 'string interior spaces', css: '.a { content: "a  b"; }' },

  // Trailing semicolons, which minification is allowed to drop.
  { label: 'trailing semicolon', css: '.a{color:red;}' },
  { label: 'trailing semicolon in media', css: '@media a{.b{top:0;}}' },
  { label: 'semicolon then comment', css: '.a{color:red;/* c */}' },

  // Degenerate input.
  { label: 'empty', css: '' },
  { label: 'unterminated string', css: '.a{content:"oops}' },
  { label: 'unterminated comment', css: '.a{color:red} /* oops' },
  { label: 'unterminated url', css: '.a{background:url(/i/l.svg' },
  { label: 'trailing backslash', css: '.a{--x:foo\\' },
];

/**
 * An independent reading of what a CSS text *means*, used as the oracle the
 * properties are judged against. stylis is this package's one dependency and
 * parses without any of the machinery under test here, so it does not share
 * the scanner's blind spots.
 *
 * Whitespace is normalized differently per position, because that is where the
 * difficulty actually lives: `.menu :hover` and `color : red` are the same
 * characters, and only the enclosing context says whether the space matters.
 * In a selector a space between compound selectors is a descendant combinator
 * and is kept; around a combinator or inside a functional pseudo-class it is
 * noise. In a declaration value it is noise around `:`, `,`, and parentheses,
 * and a required token separator between two values — `margin:0 auto` is not
 * `margin:0auto` — so it is collapsed rather than stripped, and left alone
 * inside quoted strings.
 */
const normalizeSelector = (selector: string): string =>
  selector
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*([,>+~()])\s*/g, '$1');

const normalizeValue = (value: string): string => {
  // Quote-aware: whitespace inside a string is content. Elsewhere a run
  // collapses to one space, and that space is dropped only where it cannot
  // separate two tokens.
  const out: string[] = [];
  let quote: string | null = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index] ?? '';
    if (quote) {
      out.push(char);
      if (char === '\\' && index + 1 < value.length) {
        out.push(value[index + 1] ?? '');
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      out.push(char);
      continue;
    }
    if (/\s/.test(char)) {
      if (out.at(-1) !== ' ') {
        out.push(' ');
      }
      continue;
    }
    out.push(char);
  }
  return out
    .join('')
    .replace(/\s*([:,()])\s*/g, '$1')
    .trim();
};

const structure = (css: string): string[] => {
  const lines: string[] = [];
  const walk = (elements: readonly Element[]): void => {
    for (const element of elements) {
      if (element.type === 'decl') {
        lines.push(`decl ${normalizeValue(String(element.value))}`);
        continue;
      }
      if (element.type === 'rule') {
        // `props` is `string | string[]` in stylis's types; a ruleset always
        // has the array form, but the union has to be handled to typecheck.
        const selectors = Array.isArray(element.props)
          ? element.props
          : [element.props];
        lines.push(
          `rule ${selectors.map((prop) => normalizeSelector(String(prop))).join(',')}`
        );
      } else if (element.type.startsWith('@')) {
        lines.push(
          `${element.type.toLowerCase()} ${normalizeValue(String(element.value))}`
        );
      }
      if (Array.isArray(element.children)) {
        walk(element.children);
      }
    }
  };
  walk(compile(css));
  return lines;
};

/**
 * The CSS Syntax specification's own tokenizer corpus, used here for its inputs
 * rather than its expected tokens: this scanner emits spans, not spec tokens,
 * so the reference token streams do not apply. What the corpus gives us is 185
 * pieces of CSS written specifically to break tokenizers — bad strings, EOF
 * inside a comment or a url, surrogate escapes, `CDO`/`CDC` — which is exactly
 * the input a hand-written scanner is least likely to have imagined.
 *
 * Only the implementation-independent properties run over it. The oracle
 * comparison runs too, because stylis parses all 185 without throwing.
 */
const SPEC_CORPUS: readonly { label: string; css: string }[] = Object.entries(
  testCorpus
).map(([label, { css }]) => ({ label, css }));

describe('scanCss', () => {
  it.each(CORPUS)('reproduces $label exactly from its spans', ({ css }) => {
    // Every pass rewrites the spans it understands and copies the rest, so a
    // lossy split would corrupt whatever it does not touch.
    expect(
      scanCss(css)
        .map((span) => span.text)
        .join('')
    ).toBe(css);
  });

  it.each(CORPUS)('covers $label with contiguous spans', ({ css }) => {
    let cursor = 0;
    for (const span of scanCss(css)) {
      expect(span.start).toBe(cursor);
      expect(span.end).toBeGreaterThan(span.start);
      cursor = span.end;
    }
    expect(cursor).toBe(css.length);
  });

  it('reports the enclosing block kind', () => {
    const blocks = (css: string): string[] =>
      scanCss(css)
        .filter((span) => span.kind === 'text')
        .map((span) => `${span.text}:${span.block}`);

    expect(blocks('.a{color:red}')).toEqual([
      '.a:rules',
      'color:declarations',
      'red:declarations',
    ]);
    // An at-rule prelude opens rules, so the selector inside is a selector.
    expect(blocks('@media x{.a{top:0}}')).toEqual([
      '@media:rules',
      'x:rules',
      '.a:rules',
      'top:declarations',
      '0:declarations',
    ]);
  });
});

const ORACLE_CORPUS = CORPUS.filter((entry) => entry.oracleBlind === undefined);

describe('minifyCss — properties', () => {
  it.each(CORPUS)('is idempotent for $label', ({ css }) => {
    const once = minifyCss(css);
    expect(minifyCss(once)).toBe(once);
  });

  it.each(ORACLE_CORPUS)('parses to the same CSS as $label', ({ css }) => {
    // The load-bearing property, and it has to be judged by something other
    // than our own scanner: comparing the spans before and after minification
    // is self-referential, so a scanner that mis-reads an escape mis-reads it
    // identically on both sides and the comparison passes. stylis parses
    // independently — it is already a dependency of this package, used here as
    // a test oracle rather than at runtime — so a minification that changes
    // what the CSS *means* shows up as a different parse.
    expect(structure(minifyCss(css))).toEqual(structure(css));
  });

  it.each(ORACLE_CORPUS)(
    'preserves every significant character of $label',
    ({ css }) => {
      // Independent of span kinds: whatever the scanner believes, no non-space
      // character may vanish except a `;` the closing `}` already implies.
      const chars = (value: string): string =>
        structure(value).join('').replace(/\s+/g, '');

      expect(chars(minifyCss(css))).toBe(chars(css));
    }
  );

  it.each(CORPUS)('never grows $label', ({ css }) => {
    expect(minifyCss(css).length).toBeLessThanOrEqual(css.length);
  });
});

describe('var invariant — opaque spans', () => {
  // These are cases rather than properties on purpose. The before/after
  // properties below compare the invariant against itself across
  // minification, so a scanner that mis-reads a string mis-reads it on both
  // sides and they agree. What a reference inside a literal *means* has to be
  // asserted directly.
  it('does not see declarations or references inside a string', () => {
    expect(
      collectReferencedCustomProperties('.a{content:"var(--nope)"}')
    ).toEqual([]);
    expect(collectDeclaredCustomProperties('.a{content:"--nope:1"}')).toEqual(
      new Set()
    );
  });

  it('does not see declarations or references inside a comment', () => {
    expect(
      collectReferencedCustomProperties('.a{/* var(--nope) */color:red}')
    ).toEqual([]);
    expect(
      collectDeclaredCustomProperties('.a{/* --nope:1; */color:red}')
    ).toEqual(new Set());
  });

  it('does not see references inside an unquoted url', () => {
    expect(
      collectReferencedCustomProperties('.a{background:url(/i/var(--nope))}')
    ).toEqual([]);
  });

  it('does not read an escaped colon as a declaration', () => {
    expect(
      collectDeclaredCustomProperties(String.raw`.a{--x:1;--y\:2}`)
    ).toEqual(new Set(['--x']));
  });
});

describe('var invariant — properties', () => {
  it.each(CORPUS)(
    'agrees before and after minification for $label',
    ({ css }) => {
      // The two passes read the same CSS with the same scanner, so they must not
      // disagree about it. They used to: one masked strings, the other did not.
      const before = findVarRefViolations(css)
        .map((v) => v.reference)
        .sort();
      const after = findVarRefViolations(minifyCss(css))
        .map((v) => v.reference)
        .sort();

      expect(after).toEqual(before);
    }
  );

  it.each(CORPUS)(
    'sees the same declarations after minification for $label',
    ({ css }) => {
      expect(
        [...collectDeclaredCustomProperties(minifyCss(css))].sort()
      ).toEqual([...collectDeclaredCustomProperties(css)].sort());
    }
  );

  it.each(CORPUS)(
    'sees the same references after minification for $label',
    ({ css }) => {
      expect(
        [...collectReferencedCustomProperties(minifyCss(css))].sort()
      ).toEqual([...collectReferencedCustomProperties(css)].sort());
    }
  );
});

describe('CSS Syntax specification corpus', () => {
  it('covers 185 cases', () => {
    // A guard on the corpus itself: a version bump that silently emptied it
    // would turn every property below into a no-op.
    expect(SPEC_CORPUS.length).toBeGreaterThanOrEqual(185);
  });

  it.each(SPEC_CORPUS)('reconstructs $label from its spans', ({ css }) => {
    expect(
      scanCss(css)
        .map((span) => span.text)
        .join('')
    ).toBe(css);
  });

  it.each(SPEC_CORPUS)('minifies $label idempotently', ({ css }) => {
    const once = minifyCss(css);
    expect(minifyCss(once)).toBe(once);
  });

  it.each(SPEC_CORPUS)(
    'parses $label to the same CSS after minifying',
    ({ css }) => {
      expect(structure(minifyCss(css))).toEqual(structure(css));
    }
  );

  it.each(SPEC_CORPUS)(
    'reads $label the same way before and after minifying',
    ({ css }) => {
      expect(
        findVarRefViolations(minifyCss(css))
          .map((violation) => violation.reference)
          .sort()
      ).toEqual(
        findVarRefViolations(css)
          .map((violation) => violation.reference)
          .sort()
      );
    }
  );
});
