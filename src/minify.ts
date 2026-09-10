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
