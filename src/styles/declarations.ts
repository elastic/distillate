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

import { isLocalVarMarker, isLocalVarRef } from '../local_vars';
import { isHandleLike } from '../nesting';
import {
  isContextualCssVar,
  isContextualCssVarName,
  isCssToken,
  isScaleToken,
} from '../tokens';

import type {
  Declarations,
  DeclarationSegment,
  DefaultKeyDeps,
  LocalVarMarker,
  MutableStyleDeps,
} from './types';

/** Builds a declaration block: interpolations stringify; local-var markers stay until render. */
export const buildDeclarations = (
  strings: readonly string[],
  values: readonly unknown[]
): Declarations => {
  const deps: MutableStyleDeps = {
    theme: new Set(),
    vars: new Set(),
    refs: new Set(),
    defaults: [],
  };
  const segments: DeclarationSegment[] = [];
  let pending = '';

  const flushPending = (): void => {
    if (pending.length > 0) {
      segments.push(pending);
      pending = '';
    }
  };

  strings.forEach((part, index) => {
    pending += part;
    if (index < values.length) {
      const value = values[index];
      if (isLocalVarMarker(value)) {
        flushPending();
        // Both default-emission and override-emission markers may carry
        // theme tokens or shared contextual var refs as values. Walk those
        // values and record any nested deps onto the host declaration so
        // tree-shaking and registry registration include them.
        recordMarkerDeps(value, deps);
        segments.push(value);
      } else {
        pending += stringifyCssValue(value, deps);
      }
    }
  });
  flushPending();

  assertDeclarationBlock(segments);

  return {
    css: segments,
    deps,
  };
};

const recordMarkerDeps = (
  marker: LocalVarMarker,
  deps: MutableStyleDeps
): void => {
  if (marker.__kind === 'local-var-default-marker') {
    // Default markers contribute their var paths and per-value deps only
    // through the collector's reachability pass at resolver creation. We
    // capture per-key value deps here so the collector can fold them in
    // verbatim when the key survives reachability — and skip them entirely
    // when it doesn't.
    deps.defaults.push({
      groupPath: marker.groupPath,
      keys: marker.defaults.map((item) => ({
        key: item.key,
        path: item.path,
        valueDeps: computeValueDeps(item.value),
      })),
    });
    return;
  }
  for (const item of marker.overrides) {
    deps.vars.add(item.path);
    // Stringify each value once to capture nested theme/var deps. The
    // string return is discarded — the runtime re-stringifies at render
    // time so compaction sees the same readable refs we record here.
    stringifyCssValue(item.value, deps);
  }
};

/** Theme/var deps recorded while stringifying one declaration value. */
export const computeValueDeps = (
  value: unknown
): DefaultKeyDeps['valueDeps'] => {
  const local: MutableStyleDeps = {
    theme: new Set(),
    vars: new Set(),
    refs: new Set(),
    defaults: [],
  };
  stringifyCssValue(value, local);
  return { theme: local.theme, vars: local.vars };
};

/** Stringifies one interpolable CSS value and records theme/var deps onto `deps`. */
export const stringifyCssValue = (
  value: unknown,
  deps: MutableStyleDeps
): string => {
  if (isHandleLike(value)) {
    throw new Error(
      'A style handle cannot be interpolated into a declaration value; compose with the emotion compat css instead.'
    );
  }
  if (isCssToken(value)) {
    deps.theme.add(value.path);
    return value.ref;
  }
  if (isContextualCssVar(value)) {
    deps.vars.add(value.path);
    deps.refs.add(value.path);
    return value.ref;
  }
  if (isContextualCssVarName(value)) {
    // `.name` interpolations are left-hand-side custom-property
    // identifiers, not `var(...)` references — they belong in `vars` for
    // registry coverage but not in `refs` (which feeds reachability).
    deps.vars.add(value.path);
    return value.name;
  }
  if (isLocalVarRef(value)) {
    deps.vars.add(value.path);
    deps.refs.add(value.path);
    return value.ref;
  }
  if (isScaleToken(value)) {
    return value.value;
  }
  return String(value);
};

const assertDeclarationBlock = (
  segments: readonly DeclarationSegment[]
): void => {
  for (const segment of segments) {
    if (typeof segment !== 'string') {
      continue;
    }
    if (
      /[{}]/.test(segment) ||
      /(^|[\s;])@(?:media|supports|container)\b/i.test(segment)
    ) {
      throw new Error('css and decls accept declaration blocks only.');
    }
  }
};
