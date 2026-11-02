/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StyleHandle, StyleSelectorResolver } from './types';

const ALIAS_PATTERN = /^[A-Za-z_$][\w$]*$/;

/** Callable resolver plus `h.name` aliases for each handle's local name and leaf name. Aliases prepend `.`; the call returns the bare class. */
export const createSelectorResolver = (
  handles: readonly StyleHandle[],
  className: (handle: StyleHandle) => string
): StyleSelectorResolver => {
  const resolver = ((handle: StyleHandle) =>
    className(handle)) as StyleSelectorResolver;
  const defineAlias = (name: string, handle: StyleHandle): void => {
    if (!ALIAS_PATTERN.test(name) || name in resolver) {
      return;
    }
    Object.defineProperty(resolver, name, {
      configurable: true,
      enumerable: true,
      get: () => `.${className(handle)}`,
    });
  };
  for (const handle of handles) {
    defineAlias(handle.localName, handle);
    const leafName = handle.localName.split('/').at(-1);
    if (leafName && leafName !== handle.localName) {
      defineAlias(leafName, handle);
    }
  }
  return resolver;
};
