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

// Stylis-based flattener for Emotion-style nested `css` templates.
//
// Nesting semantics (`&` substitution, comma cross-products, descendant
// defaulting, `@media` hoisting) are owned entirely by stylis. We serialize
// the authored `(strings, values)` into a sentinel-carrying CSS string, hand
// it to `compile()`, then walk the element tree and re-attach the live
// interpolated values by matching sentinels.
//
// The walk is pinned to stylis 4.4.0; `nesting_contract.test.ts` asserts the
// `compile()` tree shape (`props` vs `value`, `@media` children, DECL text).

import { compile, type Element } from 'stylis';

import { scanCss } from './css_scan';
import { isLocalVarMarker } from './local_vars';
import { isLocalVarRef } from './local_vars';
import type { StyleHandle } from './styles/types';
import {
  isContextualCssVar,
  isContextualCssVarName,
  isCssToken,
  isScaleToken,
} from './tokens';

/** Rebuilt template fragment in tagged-template shape (`strings.length === values.length + 1`). */
export interface TemplateSlice {
  /** Literal pieces between interpolations. */
  readonly strings: readonly string[];
  /** Interpolated values, one per hole. */
  readonly values: readonly unknown[];
}

/** `&`-relative selector fragment: literal text or a cross-class {@link StyleHandle}. */
export type SelectorPart = string | StyleHandle;
/** One comma alternative; parts concatenate into a selector. */
export type SelectorAlternative = readonly SelectorPart[];

/** Flattened nested rule: selector alternatives plus declaration slice. */
export interface FlattenedRule {
  /** Discriminant for {@link FlattenedEntry}. */
  readonly kind: 'rule';
  /** Comma alternatives relative to the parent handle. */
  readonly alternatives: readonly SelectorAlternative[];
  /** Declaration template for this rule. */
  readonly slice: TemplateSlice;
}

/** Flattened `@media` block: query, optional self declarations, nested rules. */
export interface FlattenedMedia {
  /** Discriminant for {@link FlattenedEntry}. */
  readonly kind: 'media';
  /** Media query text. */
  readonly query: string;
  /** Bare declarations inside the block, applied to the self handle. */
  readonly self?: TemplateSlice;
  /** Nested `&` rules inside this media block. */
  readonly rules: readonly FlattenedRule[];
}

/** Nested rule or `@media` produced by flattening. */
export type FlattenedEntry = FlattenedRule | FlattenedMedia;

/** Flattened `css` template: self declarations plus nested entries. */
export interface FlattenedTemplate {
  /** Self-handle declarations. `null` in global mode. */
  readonly self: TemplateSlice | null;
  /** Sibling nested rules and media blocks. */
  readonly nested: readonly FlattenedEntry[];
}

/** `self` keeps a host handle; `global` does not. */
export type FlattenMode = 'self' | 'global';

/** Mode and optional inlining hook for {@link flattenTemplate}. */
export interface FlattenOptions {
  /** Whether the template authors a host handle or global rules. */
  readonly mode: FlattenMode;
  /**
   * Optional splice of a value's source slice before compilation.
   * Return `null`/`undefined` to serialize the value as a sentinel.
   */
  readonly inlineValue?: (
    value: unknown,
    position: InterpolationPosition
  ) => TemplateSlice | null | undefined;
}

/** Where an interpolation sits in the serialized template. */
export type InterpolationPosition = 'selector' | 'statement';

const SELF_SENTINEL = '.__dstl_self__';

// Brace presence is the trigger for the nesting path. Brace-free templates
// keep the byte-identical fast path in `styles/authoring.ts`. Quoted braces (`content:
// "{"`) intentionally route here too — they used to throw.
export const hasNestedSyntax = (strings: readonly string[]): boolean =>
  strings.some((part) => part.includes('{') || part.includes('}'));

export const flattenTemplate = (
  strings: readonly string[],
  values: readonly unknown[],
  options: FlattenOptions
): FlattenedTemplate => {
  assertNoReservedPatterns(strings);
  const inlined = options.inlineValue
    ? inlineTemplate(strings, values, options.inlineValue)
    : { strings, values };
  const { mode } = options;
  const { text, sentinelValues } = serialize(
    inlined.strings,
    inlined.values,
    mode
  );
  scanStructure(text, mode);
  const tree = compile(canonicalizeAtMedia(text));
  return walk(tree, mode, sentinelValues);
};

// --- Serialization -------------------------------------------------------

interface Serialized {
  /** Sentinel-carrying CSS string handed to stylis. */
  readonly text: string;
  /** Sentinel index → the live interpolated value. */
  readonly sentinelValues: readonly unknown[];
}

const serialize = (
  strings: readonly string[],
  values: readonly unknown[],
  mode: FlattenMode
): Serialized => {
  let text = mode === 'self' ? `${SELF_SENTINEL}{` : '';
  strings.forEach((part, index) => {
    text += part;
    if (index >= values.length) {
      return;
    }
    const value = values[index];
    if (isLocalVarMarker(value)) {
      // Property-name sentinel; stylis DECL `.props` is the ident (`--dstl-N`).
      text += `--dstl-${index}:0;`;
      return;
    }
    if (isSerializableScalar(value) || isHandleLike(value)) {
      // Identifier sentinel in selectors and values (`__dstlN__`).
      text += `__dstl${index}__`;
      return;
    }
    throw new Error(
      `Unsupported interpolation in css template: ${describe(value)}. Interpolate a theme token, scale token, contextual var, local var (ref/marker), string, number, or a style handle in selector position.`
    );
  });
  if (mode === 'self') {
    text += '}';
  }
  return { text, sentinelValues: values };
};

// --- Pre-compile validation ---------------------------------------------

const RESERVED_PATTERNS: readonly RegExp[] = [
  /__dstl_self__/,
  /__dstl\d+__/,
  /--dstl-\d+/,
];

const assertNoReservedPatterns = (strings: readonly string[]): void => {
  for (const part of strings) {
    for (const pattern of RESERVED_PATTERNS) {
      if (pattern.test(part)) {
        throw new Error(
          `css template contains reserved flattener syntax (${pattern.source}); rename the offending identifier.`
        );
      }
    }
  }
};

// Scan-only structural validator over the serialized text. Classifies, never
// restructures — stylis owns all flattening. Enforces v1 scope before stylis
// can normalize, hoist, or silently drop malformed constructs.
const scanStructure = (text: string, mode: FlattenMode): void => {
  let depth = 0;
  let parenDepth = 0;
  let mediaDepth = 0;
  const mediaBraceStack: number[] = [];
  let quote: string | null = null;
  let inComment = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inComment) {
      if (ch === '*' && text[i + 1] === '/') {
        inComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (ch === '\\') {
        i += 1;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      inComment = true;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '(') {
      parenDepth += 1;
      continue;
    }
    if (ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }
    if (parenDepth > 0) {
      continue;
    }
    if (ch === '@') {
      const rest = text.slice(i + 1);
      const name = /^[a-zA-Z-]+/.exec(rest)?.[0] ?? '';
      if (name.toLowerCase() !== 'media') {
        throw new Error(
          `Only @media is supported in css templates; found @${name || '(unknown)'}. (@supports, @container, @keyframes, @font-face, and others are follow-ups.)`
        );
      }
      if (mediaDepth > 0) {
        throw new Error('Nested @media inside @media is not supported.');
      }
      mediaDepth += 1;
      mediaBraceStack.push(depth);
      continue;
    }
    if (ch === '{') {
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth = Math.max(0, depth - 1);
      if (
        mediaDepth > 0 &&
        mediaBraceStack.length > 0 &&
        depth === mediaBraceStack[mediaBraceStack.length - 1]
      ) {
        mediaBraceStack.pop();
        mediaDepth -= 1;
      }
      continue;
    }
    if (mode === 'global' && depth === 0) {
      if (ch === ';') {
        throw new Error(
          'injectGlobal templates cannot have top-level declarations; wrap them in a selector.'
        );
      }
      if (ch === '&') {
        throw new Error(
          'injectGlobal templates cannot use `&` at the top level; global styles have no self handle.'
        );
      }
    }
  }

  if (depth !== 0 || quote || inComment) {
    throw new Error('css template has unbalanced braces, quotes, or comments.');
  }
};

/** stylis only wraps bare in-media declarations for lowercase `@media`. */
// stylis matches at-rules case-sensitively, so `@MEDIA` has to be normalized
// before it parses. Only `text` spans are eligible: an `@media` inside a
// string, a comment, or an unquoted `url(...)` is data, and rewriting the last
// of those silently changes a case-sensitive path.
const canonicalizeAtMedia = (text: string): string =>
  scanCss(text)
    .map((span) =>
      span.kind === 'text'
        ? // A `\\b` here would also match `@media-foo`, rewriting an unknown
          // at-rule whose name merely starts with `media`.
          span.text.replace(/@media(?![\w-])/gi, '@media')
        : span.text
    )
    .join('');

// --- Walk + re-attach ----------------------------------------------------

const walk = (
  tree: readonly Element[],
  mode: FlattenMode,
  values: readonly unknown[]
): FlattenedTemplate => {
  const selfBuilder = new SliceBuilder(values);
  let selfSeen = false;
  const nested: FlattenedEntry[] = [];

  for (const element of tree) {
    if (element.type === 'rule') {
      const decls = declChildren(element);
      if (decls.length === 0) {
        continue;
      }
      if (mode === 'self' && isSelfSelector(element)) {
        selfSeen = true;
        selfBuilder.appendDecls(decls);
        continue;
      }
      nested.push(buildRule(element, values));
      continue;
    }
    if (element.type.toLowerCase() === '@media') {
      nested.push(buildMedia(element, mode, values));
      continue;
    }
    // decl/comm at top level: only reachable in global mode (self mode wraps
    // everything). Top-level decls are already rejected by the scan.
  }

  return {
    self:
      mode === 'self' ? (selfSeen ? selfBuilder.build() : emptySlice()) : null,
    nested,
  };
};

const buildRule = (
  element: Element,
  values: readonly unknown[]
): FlattenedRule => {
  const builder = new SliceBuilder(values);
  builder.appendDecls(declChildren(element));
  return {
    kind: 'rule',
    alternatives: selectorsOf(element).map((selector) =>
      reconstructSelector(selector, values)
    ),
    slice: builder.build(),
  };
};

const buildMedia = (
  element: Element,
  mode: FlattenMode,
  values: readonly unknown[]
): FlattenedMedia => {
  const query = reconstructMediaQuery(selectorsOf(element).join(','), values);
  const children = Array.isArray(element.children) ? element.children : [];
  const selfBuilder = new SliceBuilder(values);
  let selfSeen = false;
  const rules: FlattenedRule[] = [];

  for (const child of children) {
    if (child.type !== 'rule') {
      if (child.type === 'decl') {
        throw new Error(
          'Declarations directly inside @media must be within a selector.'
        );
      }
      continue;
    }
    const decls = declChildren(child);
    if (decls.length === 0) {
      continue;
    }
    if (mode === 'self' && isSelfSelector(child)) {
      selfSeen = true;
      selfBuilder.appendDecls(decls);
      continue;
    }
    rules.push(buildRule(child, values));
  }

  return {
    kind: 'media',
    query,
    ...(selfSeen ? { self: selfBuilder.build() } : {}),
    rules,
  };
};

// Rebuilds a `TemplateSlice` from a block's DECL elements in source order,
// swapping declaration sentinels back to marker objects and identifier
// sentinels back to their original values.
class SliceBuilder {
  private readonly strings: string[] = [''];
  private readonly values: unknown[] = [];

  constructor(private readonly source: readonly unknown[]) {}

  appendDecls(decls: readonly Element[]): void {
    for (const decl of decls) {
      const markerMatch = /^--dstl-(\d+)$/.exec(propName(decl));
      if (markerMatch) {
        this.pushValue(this.source[Number(markerMatch[1])]);
        continue;
      }
      this.appendText(typeof decl.value === 'string' ? decl.value : '');
    }
  }

  private appendText(text: string): void {
    const pattern = /__dstl(\d+)__/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      this.strings[this.strings.length - 1] += text.slice(
        lastIndex,
        match.index
      );
      const value = this.source[Number(match[1])];
      if (isHandleLike(value)) {
        throw new Error(
          'A style handle cannot be interpolated into a declaration value; compose with the emotion compat css instead.'
        );
      }
      this.pushValue(value);
      lastIndex = pattern.lastIndex;
    }
    this.strings[this.strings.length - 1] += text.slice(lastIndex);
  }

  private pushValue(value: unknown): void {
    this.values.push(value);
    this.strings.push('');
  }

  build(): TemplateSlice {
    return { strings: this.strings, values: this.values };
  }
}

const reconstructSelector = (
  selector: string,
  values: readonly unknown[]
): SelectorAlternative => {
  const withSelf = selector.split(SELF_SENTINEL).join('&');
  const parts: SelectorPart[] = [];
  const pattern = /\.?__dstl(\d+)__/g;
  let lastIndex = 0;
  let buffer = '';
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(withSelf)) !== null) {
    buffer += withSelf.slice(lastIndex, match.index);
    if (buffer.length > 0) {
      parts.push(buffer);
      buffer = '';
    }
    const value = values[Number(match[1])];
    if (!isHandleLike(value)) {
      throw new Error(
        `Only style handles may be interpolated into selector position; received ${describe(value)}.`
      );
    }
    parts.push(value);
    lastIndex = pattern.lastIndex;
  }
  buffer += withSelf.slice(lastIndex);
  if (buffer.length > 0 || parts.length === 0) {
    parts.push(buffer);
  }
  return parts;
};

const reconstructMediaQuery = (
  query: string,
  values: readonly unknown[]
): string =>
  query.replace(/__dstl(\d+)__/g, (_match, index: string) => {
    const value = values[Number(index)];
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    throw new Error(
      `Media queries may interpolate strings or numbers only; received ${describe(value)}.`
    );
  });

// --- Composition inlining ------------------------------------------------

const inlineTemplate = (
  strings: readonly string[],
  values: readonly unknown[],
  inlineValue: NonNullable<FlattenOptions['inlineValue']>
): TemplateSlice => {
  const outStrings: string[] = [strings[0] ?? ''];
  const outValues: unknown[] = [];

  const mergeSlice = (slice: TemplateSlice): void => {
    outStrings[outStrings.length - 1] += slice.strings[0] ?? '';
    for (let i = 0; i < slice.values.length; i += 1) {
      outValues.push(slice.values[i]);
      outStrings.push(slice.strings[i + 1] ?? '');
    }
  };

  values.forEach((value, index) => {
    const position = detectPosition(strings, index);
    const spliced = inlineValue(value, position);
    if (spliced) {
      mergeSlice(inlineTemplate(spliced.strings, spliced.values, inlineValue));
      outStrings[outStrings.length - 1] += strings[index + 1] ?? '';
      return;
    }
    outValues.push(value);
    outStrings.push(strings[index + 1] ?? '');
  });

  return { strings: outStrings, values: outValues };
};

// Cheap position heuristic: the first structural char in the following string
// decides. A `{` before any `;`/`}` means the interpolation is building a
// selector; anything else is a statement/value position.
const detectPosition = (
  strings: readonly string[],
  index: number
): InterpolationPosition => {
  const next = strings[index + 1] ?? '';
  for (const ch of next) {
    if (ch === '{') {
      return 'selector';
    }
    if (ch === ';' || ch === '}') {
      return 'statement';
    }
  }
  return 'statement';
};

// --- Element helpers -----------------------------------------------------

const selectorsOf = (element: Element): readonly string[] =>
  Array.isArray(element.props) ? element.props : [element.props];

const isSelfSelector = (element: Element): boolean => {
  const selectors = selectorsOf(element);
  return selectors.length === 1 && selectors[0] === SELF_SENTINEL;
};

const declChildren = (element: Element): readonly Element[] =>
  Array.isArray(element.children)
    ? element.children.filter((child) => child.type === 'decl')
    : [];

const propName = (element: Element): string =>
  typeof element.props === 'string' ? element.props : (element.props[0] ?? '');

// --- Value guards --------------------------------------------------------

const isSerializableScalar = (value: unknown): boolean =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  isCssToken(value) ||
  isContextualCssVar(value) ||
  isContextualCssVarName(value) ||
  isScaleToken(value) ||
  isLocalVarRef(value);

export const isHandleLike = (value: unknown): value is StyleHandle =>
  Boolean(
    value &&
    typeof value === 'object' &&
    (value as { kind?: string }).kind === 'handle'
  );

const emptySlice = (): TemplateSlice => ({ strings: [''], values: [] });

const describe = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (typeof value === 'object') {
    const kind = (value as { kind?: string; __kind?: string }).kind;
    const brand = (value as { __kind?: string }).__kind;
    return `object${kind ? ` (kind: ${kind})` : brand ? ` (${brand})` : ''}`;
  }
  return typeof value;
};
