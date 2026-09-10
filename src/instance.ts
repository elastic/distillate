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
