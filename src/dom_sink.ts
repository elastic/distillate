/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
