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

import type { StyleSink } from './emotion';

/** Minimal interface for a DOM `<style>` element. */
export interface StyleElementLike {
  /** Current stylesheet text, or `null` before the first flush. */
  textContent: string | null;
}

/** Minimal interface for a DOM `Document` able to create and append style tags. */
export interface DocumentLike {
  /** Creates a `<style>` element. */
  createElement(tagName: 'style'): StyleElementLike;
  /** Node that receives the created style element. */
  readonly head: { appendChild(node: StyleElementLike): void };
}

/** Host document and optional flush scheduler for a `<style>` sink. */
export interface CreateDomSinkOptions {
  /** The host document where the style element will be appended. */
  document: DocumentLike;
  /** Defers the flush. Defaults to `queueMicrotask`. */
  schedule?: (flush: () => void) => void;
}

/**
 * One managed `<style>` element, rewritten on each flush.
 */
export const createDomSink = ({
  document,
  schedule = queueMicrotask,
}: CreateDomSinkOptions): StyleSink => {
  let element: StyleElementLike | null = null;
  let dirty = false;
  let latestRender: (() => string) | null = null;

  const flush = (): void => {
    dirty = false;
    if (!latestRender) {
      return;
    }
    if (!element) {
      element = document.createElement('style');
      document.head.appendChild(element);
    }
    element.textContent = latestRender();
  };

  return {
    invalidate(render) {
      latestRender = render;
      if (dirty) {
        return;
      }
      dirty = true;
      schedule(flush);
    },
  };
};
