/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Receives stylesheet invalidation from a live collection or Emotion compat modules. */
export interface StyleSink {
  /** Marks the sink dirty. `render` produces the current stylesheet when it flushes. */
  invalidate(render: () => string): void;
}

/** Minimal interface for a DOM `<style>` element. */
export interface StyleElementLike {
  /** Current stylesheet text, or `null` before the first flush. */
  textContent: string | null;
}

/** Node that receives a managed `<style>` element, e.g. `document.head` or a `ShadowRoot`. */
export interface StyleParentLike {
  // Method syntax (bivariant) so DOM `Node.appendChild<T extends Node>` assigns.
  /** Appends the managed style element. */
  appendChild(node: StyleElementLike): void;
}
