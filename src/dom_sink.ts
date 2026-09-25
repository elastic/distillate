/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StyleElementLike, StyleParentLike, StyleSink } from './sink';

export type { StyleElementLike, StyleParentLike } from './sink';

/** Minimal interface for a DOM `Document` able to create and append style tags. */
export interface DocumentLike {
  /** Creates a `<style>` element. */
  createElement(tagName: 'style'): StyleElementLike;
  /** Default parent for the created style element. */
  readonly head: StyleParentLike;
}

/** Host document and optional flush scheduler for a `<style>` sink. */
export interface CreateDomSinkOptions {
  /** Document that creates the style element. */
  document: DocumentLike;
  /** Node that receives the style element, e.g. a `ShadowRoot`. Defaults to `document.head`. */
  parent?: StyleParentLike;
  /** Defers the flush. Defaults to `queueMicrotask`. */
  schedule?: (flush: () => void) => void;
}

/**
 * One managed `<style>` element, rewritten on each flush.
 */
export const createDomSink = ({
  document,
  parent,
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
      (parent ?? document.head).appendChild(element);
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
