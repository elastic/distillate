/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// One scanner for the three passes that need to read CSS text: minification,
// the `@media` canonicalization in `nesting.ts`, and the var invariant in
// `./testing`. Each of those grew its own character loop, and each learned the
// same lessons separately and late — comments inside `url(...)`, backslash
// escapes, at-rules inside `url(...)`, selector-versus-declaration position.
// A span is the unit all three actually need: a stretch of text with a kind
// that says whether its contents are code or opaque, plus where it sits.
//
// This is deliberately not a CSS Syntax Level 3 tokenizer. It models the six
// things those passes get wrong and nothing else, because a promise of full
// conformance is one this module would not keep.

/** What a span's text is, which decides whether a pass may look inside it. */
export type CssSpanKind =
  /** `/* … *\/`, including the delimiters. Opaque. */
  | 'comment'
  /** A quoted string, including the quotes and any escapes. Opaque. */
  | 'string'
  /** An unquoted `url(…)` function token, including the parentheses. Opaque. */
  | 'url'
  /** A backslash and the character it escapes, outside a string. Opaque. */
  | 'escape'
  /** A run of whitespace. */
  | 'whitespace'
  /** One of `{ } : ; , >`. */
  | 'structural'
  /** Anything else, run together: identifiers, values, selectors, `var(`. */
  | 'text';

/** Whether the enclosing block holds declarations or further rules. */
export type CssBlockKind = 'rules' | 'declarations';

/** One scanner span: kind, source slice, and block context. */
export interface CssSpan {
  /** What this span's text is; opaque kinds are skipped by later passes. */
  readonly kind: CssSpanKind;
  /** Source slice for this span, including delimiters. */
  readonly text: string;
  /** Index of the first character in the source. */
  readonly start: number;
  /** Index one past the last character in the source. */
  readonly end: number;
  /**
   * What the enclosing block holds. An at-rule prelude (`@media …`) opens a
   * block of rules; anything else opens declarations; top level is rules.
   *
   * This is what separates `color : red` — where the space before `:` is
   * noise — from `.menu :hover`, where it is a descendant combinator.
   */
  readonly block: CssBlockKind;
  /** Block nesting depth; `0` at top level. */
  readonly depth: number;
}

const STRUCTURAL = new Set(['{', '}', ':', ';', ',', '>']);
const URL_PREFIX = 'url(';

/** `true` when an unquoted `url(` function token starts at `index`. */
const isUnquotedUrlStart = (value: string, index: number): boolean => {
  // Cheap rejection first: this runs at every index of every text span, and
  // all but one character in a few hundred fails here rather than in a
  // `slice().toLowerCase()`.
  const head = value[index];
  if (head !== 'u' && head !== 'U') {
    return false;
  }
  // `url(` has to open a function token rather than end a longer identifier.
  // `myurl(/a/*b*/c)` is some other function, and reading it as a url would
  // make its contents opaque — hiding a real comment from every pass.
  const before = value[index - 1];
  if (before !== undefined && /[\w\\-]/.test(before)) {
    return false;
  }
  if (
    value.slice(index, index + URL_PREFIX.length).toLowerCase() !== URL_PREFIX
  ) {
    return false;
  }
  let cursor = index + URL_PREFIX.length;
  while (cursor < value.length && /\s/.test(value[cursor] ?? '')) {
    cursor += 1;
  }
  const first = value[cursor];
  return first !== '"' && first !== "'";
};

/** Index one past an unquoted `url(…)` token that starts at `start`. */
const endOfUrl = (value: string, start: number): number => {
  for (
    let index = start + URL_PREFIX.length;
    index < value.length;
    index += 1
  ) {
    const char = value[index];
    if (char === '\\' && index + 1 < value.length) {
      index += 1;
      continue;
    }
    if (char === ')') {
      return index + 1;
    }
  }
  return value.length;
};

/** Index one past a quoted string that starts at `start`. Unterminated runs to the end. */
const endOfString = (value: string, start: number): number => {
  const quote = value[start];
  for (let index = start + 1; index < value.length; index += 1) {
    const char = value[index];
    if (char === '\\' && index + 1 < value.length) {
      index += 1;
      continue;
    }
    if (char === quote) {
      return index + 1;
    }
  }
  return value.length;
};

/** Index one past a `/* … *\/` comment that starts at `start`. Unterminated runs to the end. */
const endOfComment = (value: string, start: number): number => {
  const closing = value.indexOf('*/', start + 2);
  return closing === -1 ? value.length : closing + 2;
};

/**
 * Splits `value` into spans.
 *
 * Concatenating every span's `text` reproduces `value` exactly, which is what
 * lets a pass rewrite the spans it understands and copy the rest through.
 *
 * @param value CSS text.
 */
export const scanCss = (value: string): readonly CssSpan[] => {
  const spans: CssSpan[] = [];
  const blocks: CssBlockKind[] = ['rules'];
  // Null until the first significant character of a prelude is seen, so that
  // `@media …{` opens rules and `.a …{` opens declarations.
  let preludeIsAtRule: boolean | null = null;
  let index = 0;

  const push = (kind: CssSpanKind, start: number, end: number): void => {
    spans.push({
      kind,
      text: value.slice(start, end),
      start,
      end,
      block: blocks.at(-1) ?? 'rules',
      depth: blocks.length - 1,
    });
  };

  while (index < value.length) {
    const char = value[index] ?? '';
    const next = value[index + 1];

    if (char === '/' && next === '*') {
      const end = endOfComment(value, index);
      push('comment', index, end);
      index = end;
      continue;
    }

    if (char === '"' || char === "'") {
      const end = endOfString(value, index);
      push('string', index, end);
      index = end;
      continue;
    }

    if (char === '\\' && next !== undefined) {
      push('escape', index, index + 2);
      index += 2;
      continue;
    }

    if (isUnquotedUrlStart(value, index)) {
      const end = endOfUrl(value, index);
      push('url', index, end);
      index = end;
      continue;
    }

    if (/\s/.test(char)) {
      let end = index + 1;
      while (end < value.length && /\s/.test(value[end] ?? '')) {
        end += 1;
      }
      push('whitespace', index, end);
      index = end;
      continue;
    }

    if (STRUCTURAL.has(char)) {
      // Depth changes after the span is recorded, so `{` reads as belonging to
      // the block it closes over rather than the one it opens.
      push('structural', index, index + 1);
      if (char === '{') {
        blocks.push(preludeIsAtRule ? 'rules' : 'declarations');
      } else if (char === '}' && blocks.length > 1) {
        blocks.pop();
      }
      if (char === '{' || char === '}' || char === ';') {
        preludeIsAtRule = null;
      }
      index += 1;
      continue;
    }

    if (preludeIsAtRule === null) {
      preludeIsAtRule = char === '@';
    }
    let end = index + 1;
    while (end < value.length) {
      const ahead = value[end] ?? '';
      if (
        STRUCTURAL.has(ahead) ||
        /\s/.test(ahead) ||
        ahead === '"' ||
        ahead === "'" ||
        ahead === '\\' ||
        (ahead === '/' && value[end + 1] === '*') ||
        isUnquotedUrlStart(value, end)
      ) {
        break;
      }
      end += 1;
    }
    push('text', index, end);
    index = end;
  }

  return spans;
};

/**
 * `true` for spans whose text is a literal rather than code — a comment, a
 * quoted string, an unquoted `url(...)`, or an escape pair. A pass may rewrite
 * what is inside a code span and must copy an opaque one through untouched.
 */
export const isOpaque = (span: CssSpan): boolean =>
  span.kind === 'comment' ||
  span.kind === 'string' ||
  span.kind === 'url' ||
  span.kind === 'escape';

/** True when `value` has no declarations left after comments, whitespace, and bare `;` are ignored. */
export const isBlankCss = (value: string): boolean =>
  scanCss(value).every(
    (span) =>
      span.kind === 'comment' ||
      span.kind === 'whitespace' ||
      (span.kind === 'structural' && span.text === ';')
  );
