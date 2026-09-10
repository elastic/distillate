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

import { type CssBlockKind, isOpaque, scanCss } from './css_scan';

const DECLARATION_RE = /(--[A-Za-z_][\w-]*)\s*:/g;
const REFERENCE_RE = /var\(\s*(--[A-Za-z_][\w-]*)/g;

/** A `var(...)` whose custom property is never declared in the same CSS text. */
export interface VarInvariantViolation {
  /** The undeclared custom property name (e.g. `--aui-color-bg`). */
  readonly reference: string;
  /** Surrounding CSS text for error reporting. */
  readonly context: string;
}

interface ScannedCss {
  /**
   * `css` with comments, strings, `url(...)` tokens, and escapes blanked to
   * spaces, positions preserved. A `var(` inside a string is text, a `;`
   * inside an escape is part of a value, and neither should match here.
   */
  readonly masked: string;
  /** The enclosing block kind at each character offset. */
  readonly blockAt: readonly CssBlockKind[];
}

const scan = (css: string): ScannedCss => {
  const masked: string[] = [];
  const blockAt: CssBlockKind[] = [];
  for (const span of scanCss(css)) {
    const blank = isOpaque(span);
    for (let offset = 0; offset < span.text.length; offset += 1) {
      masked.push(blank ? ' ' : (span.text[offset] ?? ''));
      blockAt.push(span.block);
    }
  }
  return { masked: masked.join(''), blockAt };
};

/**
 * A custom property is declared where a declaration can start: inside a
 * declarations block, as the first thing after `{` or `;`. A selector carrying
 * a BEM-style modifier and a pseudo-class (`.button--active:hover`) matches the
 * same characters and declares nothing.
 */
const isDeclarationStart = (
  { masked, blockAt }: ScannedCss,
  index: number
): boolean => {
  if (blockAt[index] !== 'declarations') {
    return false;
  }
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const char = masked[cursor];
    if (char === undefined || !/\s/.test(char)) {
      return char === '{' || char === ';';
    }
  }
  return false;
};

/**
 * `var` has to open a function token rather than end a longer identifier:
 * `--expr:myvar(--x)` names some other function.
 */
const isFunctionTokenStart = (masked: string, index: number): boolean => {
  const before = masked[index - 1];
  return before === undefined || !/[\w\\-]/.test(before);
};

/** Collects every custom property declared in a declaration position in `css`. */
export const collectDeclaredCustomProperties = (css: string): Set<string> => {
  const scanned = scan(css);
  const declared = new Set<string>();
  for (const match of scanned.masked.matchAll(DECLARATION_RE)) {
    const name = match[1];
    if (name && isDeclarationStart(scanned, match.index ?? 0)) {
      declared.add(name);
    }
  }
  return declared;
};

/** Collects all custom property names referenced inside `var(...)` calls in `css`. */
export const collectReferencedCustomProperties = (
  css: string
): readonly string[] => {
  const { masked } = scan(css);
  const names: string[] = [];
  for (const match of masked.matchAll(REFERENCE_RE)) {
    const name = match[1];
    if (name && isFunctionTokenStart(masked, match.index ?? 0)) {
      names.push(name);
    }
  }
  return names;
};

/**
 * Returns all `var(...)` references whose custom property is never declared in `css`.
 *
 * @param css Full CSS text to scan.
 */
export const findVarRefViolations = (
  css: string
): readonly VarInvariantViolation[] => {
  const { masked } = scan(css);
  const declared = collectDeclaredCustomProperties(css);
  const violations: VarInvariantViolation[] = [];
  for (const match of masked.matchAll(REFERENCE_RE)) {
    const ref = match[1];
    const index = match.index ?? 0;
    if (!ref || declared.has(ref) || !isFunctionTokenStart(masked, index)) {
      continue;
    }
    violations.push({
      reference: ref,
      context: css.slice(Math.max(0, index - 40), index + ref.length + 8),
    });
  }
  return violations;
};

/**
 * Throws if any `var(...)` in `css` has no matching custom-property declaration.
 *
 * @param css Full CSS text to scan.
 * @throws If any reference has no declaration in the same text.
 */
export const assertVarRefsHaveDeclarations = (css: string): void => {
  const violations = findVarRefViolations(css);
  if (violations.length === 0) {
    return;
  }
  const lines = violations.map(
    ({ reference, context }) =>
      `- ${reference} referenced near "${context.replace(/\s+/g, ' ')}"`
  );
  throw new Error(
    `${violations.length} var(...) reference(s) without a matching declaration:\n${lines.join('\n')}`
  );
};
