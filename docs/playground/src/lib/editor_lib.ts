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

import { tokenTreeDts } from '@elastic/distillate/testing';

import type { PlaygroundMode } from './compile';
import { demoTokens } from './demo_environment';

/** Virtual path for the playground ambient extraLib. */
export const PLAYGROUND_EXTRA_LIB_PATH = 'file:///playground-globals.d.ts';

const demoTokensInterface = tokenTreeDts('DemoTokens', demoTokens);

const sharedTypes = `
interface CssInterpolable {
  readonly [Symbol.toPrimitive]: (hint: string) => string;
  toString(): string;
}

type CssValue = CssInterpolable | string | number;

${demoTokensInterface}

interface StyleHandle extends CssInterpolable {
  readonly readableName: string;
  readonly localName: string;
  readonly key: string;
}

type LocalVarGroup<K extends string> = { readonly [P in K]: CssInterpolable } & {
  set(overrides: Partial<Record<K, CssValue>>): CssInterpolable;
};

interface StyleAuthoringApi {
  css(strings: TemplateStringsArray, ...values: unknown[]): StyleHandle;
  decls(strings: TemplateStringsArray, ...values: unknown[]): unknown;
  vars<K extends string>(
    group: string,
    defaults: Record<K, CssValue>
  ): LocalVarGroup<K>;
  readonly tokens: DemoTokens;
}

interface PrimitiveStyleAuthoringApi {
  style(strings: TemplateStringsArray, ...values: unknown[]): StyleHandle;
  readonly tokens: DemoTokens;
}

interface StylesModule<T> {
  readonly name: string;
  readonly handles: T;
}

/** Demo theme and scale tokens. Interpolate into \`css\` templates. */
declare const tokens: DemoTokens;

/** Joins class names and handle \`readableName\`s. Collects handles for the artifact. */
declare function cn(
  ...args: Array<StyleHandle | string | number | false | null | undefined>
): string;
`;

const emotionGlobals = `
/** Emotion-compat tagged template. Nested \`&\` and \`@media\` flatten. */
declare function css(
  strings: TemplateStringsArray,
  ...values: unknown[]
): StyleHandle;

/** Joins class names, handles, arrays, and truthy maps. */
declare function cx(
  ...args: Array<
    | StyleHandle
    | string
    | number
    | false
    | null
    | undefined
    | ReadonlyArray<unknown>
    | { readonly [className: string]: boolean }
  >
): string;

/** Registers global rules (\`body\`, \`html\`, …). */
declare function injectGlobal(
  strings: TemplateStringsArray,
  ...values: unknown[]
): void;
`;

const nativeGlobals = `
/** Named module. Destructure \`css\` / \`vars\` / \`tokens\` from the factory argument. */
declare function createStyleModule<T extends Record<string, unknown>>(
  name: string,
  factory: (api: StyleAuthoringApi) => T
): StylesModule<T>;

/** Named handles plus tokens only. */
declare function primitiveStyles<T extends Record<string, unknown>>(
  name: string,
  factory: (api: PrimitiveStyleAuthoringApi) => T
): StylesModule<T>;

declare function rule(
  selector: (h: (handle: StyleHandle) => string) => string,
  declarations: unknown
): unknown;

declare function media(query: string, rules: readonly unknown[]): unknown;

declare function container(query: string, rules: readonly unknown[]): unknown;

declare function variants<K extends string, V>(
  domain: readonly K[],
  factory: (value: K) => V
): Record<K, V>;
`;

/** Ambient `.d.ts` matching the playground eval scope for `mode`. */
export const extraLibSource = (mode: PlaygroundMode): string =>
  `${sharedTypes}${mode === 'emotion' ? emotionGlobals : nativeGlobals}`;

/** Binding names injected at eval time for `mode`. */
export const playgroundScopeNames = (
  mode: PlaygroundMode
): readonly string[] =>
  mode === 'emotion'
    ? ['tokens', 'cn', 'css', 'cx', 'injectGlobal']
    : [
        'tokens',
        'cn',
        'createStyleModule',
        'primitiveStyles',
        'rule',
        'media',
        'container',
        'variants',
      ];
