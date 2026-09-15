/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** `globalThis` key for the loaded copy's identity. See the README. */
export const INSTANCE_KEY: unique symbol = Symbol.for(
  'elastic.distillate.instance'
);

/** Object that may hold the Distillate instance identity, normally `globalThis`. */
export interface InstanceHost {
  /** Identity token of the first Distillate copy that registered. */
  [INSTANCE_KEY]?: string;
}

/**
 * Records this copy's identity and warns if a different token is already registered.
 *
 * @param host Object carrying the marker, normally `globalThis`.
 * @param instanceId This copy's identity token.
 * @param warn Injected so tests need not intercept the console.
 */
export const registerDistillateInstance = (
  host: InstanceHost,
  instanceId: string,
  warn: (message: string) => void = (message) => console.warn(message)
): void => {
  const registered = host[INSTANCE_KEY];
  if (registered === undefined) {
    host[INSTANCE_KEY] = instanceId;
    return;
  }
  if (registered === instanceId) {
    return;
  }
  warn(
    `@elastic/distillate: a second copy loaded (${instanceId}; already registered ${registered}). ` +
      'The engine keeps module-scope state, so two copies silently break `variants(...)` tree-shaking ' +
      'and inflate emitted CSS. Externalize @elastic/distillate in your bundler so exactly one copy loads.'
  );
};

registerDistillateInstance(
  globalThis as InstanceHost,
  `@elastic/distillate/instance#${Math.random().toString(36).slice(2)}`
);
