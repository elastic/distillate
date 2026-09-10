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

import {
  container,
  media,
  rule,
  type StyleHandle,
  type StylesCollector,
  variants,
} from '@elastic/distillate';
import { type ClassNameArg, createEmotion } from '@elastic/distillate/emotion';
import { transform } from 'sucrase';

import {
  createDemoDistillery,
  type DemoTokens,
  demoTokens,
} from './demo_environment';

export type PlaygroundMode = 'emotion' | 'native';

export type CompileStage = 'transform' | 'evaluate' | 'render';

export interface CompileError {
  readonly stage: CompileStage;
  readonly message: string;
}

export interface CompileSuccess {
  readonly ok: true;
  readonly previewHtml: string;
  readonly readableCss: string;
  readonly compactCss: string;
  readonly artifactCss: string;
  readonly stylesheetBytes: number;
  readonly artifactBytes: number;
}

export interface CompileFailure {
  readonly ok: false;
  readonly error: CompileError;
}

export type PlaygroundResult = CompileSuccess | CompileFailure;

type Distillery = ReturnType<typeof createDemoDistillery>;

const utf8Bytes = (css: string): number =>
  new TextEncoder().encode(css).byteLength;

const stripImports = (source: string): string =>
  source.replace(/^\s*import\b.*(?:\n|$)/gm, '');

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isStyleHandle = (value: unknown): value is StyleHandle =>
  Boolean(
    value &&
    typeof value === 'object' &&
    (value as { kind?: string }).kind === 'handle'
  );

const collectStyleHandles = (
  collector: StylesCollector,
  values: readonly unknown[]
): void => {
  const handles: StyleHandle[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (isStyleHandle(value)) {
      handles.push(value);
    }
  };
  for (const value of values) {
    walk(value);
  }
  if (handles.length > 0) {
    collector.useHandles(handles);
  }
};

const readableClassName = (...args: readonly unknown[]): string =>
  args
    .filter((arg): arg is NonNullable<typeof arg> => Boolean(arg))
    .map((arg) => {
      if (typeof arg === 'string') {
        return arg;
      }
      if (typeof arg === 'number') {
        return String(arg);
      }
      const readable = (arg as Partial<StyleHandle>).readableName;
      return typeof readable === 'string' ? readable : '';
    })
    .filter(Boolean)
    .join(' ');

const cnFor =
  (collector: StylesCollector) =>
  (...args: readonly unknown[]): string => {
    collectStyleHandles(collector, args);
    return readableClassName(...args);
  };

const bindEmotionCollection = (
  distillery: Distillery,
  collector: StylesCollector
): Record<string, unknown> => {
  const emotion = createEmotion<DemoTokens>(distillery);
  const css = (
    strings: TemplateStringsArray,
    ...values: readonly unknown[]
  ): ReturnType<typeof emotion.css> => {
    const handle = emotion.css(strings, ...values);
    const asString = (): string => {
      collector.useHandles([handle]);
      return handle.readableName;
    };
    handle.toString = asString;
    handle[Symbol.toPrimitive] = asString;
    return handle;
  };
  const cx = (...args: readonly ClassNameArg[]): string => {
    collectStyleHandles(collector, args);
    return emotion.cx(...args);
  };
  return {
    css,
    cx,
    injectGlobal: (
      strings: TemplateStringsArray,
      ...values: readonly unknown[]
    ): void => emotion.injectGlobal(strings, ...values),
  };
};

const buildScope = (
  mode: PlaygroundMode,
  distillery: Distillery,
  collector: StylesCollector
): Record<string, unknown> => {
  const shared: Record<string, unknown> = {
    cn: cnFor(collector),
    tokens: demoTokens,
  };
  if (mode === 'emotion') {
    return { ...shared, ...bindEmotionCollection(distillery, collector) };
  }
  const { createStyleModule, primitiveStyles } = distillery;
  return {
    ...shared,
    createStyleModule,
    primitiveStyles,
    rule,
    media,
    container,
    variants,
  };
};

const evaluate = (
  transformed: string,
  scope: Record<string, unknown>
): unknown => {
  // Playground compiler: eval is the point.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const factory = new Function(
    'scope',
    `with (scope) {\n${transformed}\n}`
  ) as (scope: Record<string, unknown>) => unknown;
  return factory(scope);
};

export const compilePlayground = (
  source: string,
  mode: PlaygroundMode
): PlaygroundResult => {
  const normalized = stripImports(source);

  let transformed: string;
  try {
    transformed = transform(normalized, {
      transforms: ['typescript'],
      production: true,
    }).code;
  } catch (error) {
    return {
      ok: false,
      error: { stage: 'transform', message: messageOf(error) },
    };
  }

  const distillery = createDemoDistillery();
  const artifactCollector = distillery.artifactCollector('compact');
  let returned: unknown;
  try {
    returned = evaluate(
      transformed,
      buildScope(mode, distillery, artifactCollector)
    );
  } catch (error) {
    return {
      ok: false,
      error: { stage: 'evaluate', message: messageOf(error) },
    };
  }

  try {
    const previewHtml = typeof returned === 'string' ? returned : '';
    const readableCss = distillery.renderStyles(
      distillery.stylesheetCollector('readable')
    );
    const compactCss = distillery.renderStyles(
      distillery.stylesheetCollector('compact')
    );
    const artifactResolver = artifactCollector.createResolver();
    const artifactCss = distillery.renderStyles(
      artifactCollector,
      artifactResolver
    );
    return {
      ok: true,
      previewHtml,
      readableCss,
      compactCss,
      artifactCss,
      stylesheetBytes: utf8Bytes(readableCss),
      artifactBytes: utf8Bytes(artifactCss),
    };
  } catch (error) {
    return { ok: false, error: { stage: 'render', message: messageOf(error) } };
  }
};
