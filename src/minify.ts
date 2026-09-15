/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type CssSpan, scanCss } from './css_scan';

/**
 * A space between two non-structural spans is significant wherever it sits: a
 * descendant combinator in a selector (`.a .b`), a token separator in a value
 * (`margin:0 auto`). Beside a structural character it is noise, except before
 * a pseudo-class colon in a rules block — `.menu :hover` is not `.menu:hover`,
 * while `color : red` is `color:red`.
 */
const spaceIsSignificant = (
  before: CssSpan | undefined,
  after: CssSpan | undefined
): boolean => {
  if (!before || !after) {
    return false;
  }
  if (before.kind === 'structural') {
    return false;
  }
  if (after.kind === 'structural') {
    // Only a pseudo-class colon in a selector keeps the space in front of it.
    // Space before `{`, `}`, `;`, `,`, or `>` is never significant.
    return after.text === ':' && after.block === 'rules';
  }
  return true;
};

/**
 * Strips comments and insignificant whitespace from CSS.
 *
 * Strings, unquoted `url(…)` tokens, and backslash escapes pass through
 * untouched: their contents are literal, so a `/*` or a `;` inside one is data
 * rather than syntax.
 *
 * @param value Raw CSS text.
 */
export const minifyCss = (value: string): string => {
  // Dropping comments can leave two whitespace spans adjacent — `.a /*c*/ .b`
  // — and emitting one space per span would keep both. Coalescing after the
  // filter makes the run a single decision.
  const spans = scanCss(value)
    .filter((span) => span.kind !== 'comment')
    .filter(
      (span, index, all) =>
        span.kind !== 'whitespace' || all[index - 1]?.kind !== 'whitespace'
    );
  const out: string[] = [];
  // Indices into `spans` of what has been emitted, so lookaround skips the
  // whitespace being decided about.
  const significant = spans.filter((span) => span.kind !== 'whitespace');
  let significantIndex = 0;

  spans.forEach((span) => {
    if (span.kind === 'whitespace') {
      const before = significant[significantIndex - 1];
      const after = significant[significantIndex];
      if (spaceIsSignificant(before, after)) {
        out.push(' ');
      }
      return;
    }

    // A declaration's terminator is redundant against the block's own close.
    // Only a bare `;` qualifies: an escaped one is part of a value, and it
    // arrives as an `escape` span rather than a structural `;`.
    if (
      span.kind === 'structural' &&
      span.text === '}' &&
      significant[significantIndex - 1]?.kind === 'structural' &&
      significant[significantIndex - 1]?.text === ';'
    ) {
      out.pop();
    }

    out.push(span.text);
    significantIndex += 1;
  });

  return out.join('').trim();
};
