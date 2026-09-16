/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Content hashing for anonymous emotion `css`/`injectGlobal` modules.
//
// Deterministic 64-bit FNV-1a (two 32-bit passes with distinct offset bases)
// over a canonical serialization of the authored template. Determinism lets
// server-rendered and client-rendered class names agree without coordination.

import type { LocalVarMarker } from './local_vars';
import { isLocalVarMarker } from './local_vars';
import { isLocalVarRef } from './local_vars';
import { isHandleLike } from './nesting';
import {
  isContextualCssVar,
  isContextualCssVarName,
  isCssToken,
  isScaleToken,
} from './tokens';

const FNV_PRIME = 0x01000193;
const FNV_OFFSET_A = 0x811c9dc5;
// A second basis derived from the golden-ratio constant so the two passes
// disagree, widening the effective hash to 64 bits.
const FNV_OFFSET_B = (0x811c9dc5 ^ 0x9e3779b9) >>> 0;

const fnv1a = (input: string, offset: number): number => {
  let hash = offset;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
};

const base36 = (value: number): string => value.toString(36).padStart(7, '0');

export const contentHash64 = (
  strings: readonly string[],
  values: readonly unknown[]
): string => {
  const canonical = canonicalize(strings, values);
  return (
    base36(fnv1a(canonical, FNV_OFFSET_A)) +
    base36(fnv1a(canonical, FNV_OFFSET_B))
  );
};

// Canonical, injective-enough serialization. Template strings and tagged
// values are interleaved and joined with a NUL sentinel that cannot appear in
// authored CSS, so distinct templates cannot collide by concatenation.
const canonicalize = (
  strings: readonly string[],
  values: readonly unknown[]
): string => {
  const segments: string[] = [];
  strings.forEach((part, index) => {
    segments.push(part);
    if (index < values.length) {
      segments.push(tagValue(values[index]));
    }
  });
  return segments.join('\u0000');
};

const tagValue = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number') {
    return `r:${value}`;
  }
  if (isCssToken(value)) {
    return `t:${value.path}`;
  }
  if (isContextualCssVar(value)) {
    return `v:${value.path}`;
  }
  if (isContextualCssVarName(value)) {
    return `n:${value.path}`;
  }
  if (isLocalVarRef(value)) {
    return `l:${value.path}`;
  }
  if (isScaleToken(value)) {
    return `s:${value.value}`;
  }
  if (isLocalVarMarker(value)) {
    return tagMarker(value);
  }
  if (isHandleLike(value)) {
    return `h:${value.key}`;
  }
  throw new Error(
    `Unsupported interpolation in css template. Interpolate a theme token, scale token, contextual var, local var (ref/marker), string, number, or a style handle.`
  );
};

const tagMarker = (marker: LocalVarMarker): string => {
  if (marker.__kind === 'local-var-default-marker') {
    const entries = marker.defaults
      .map((item) => `${item.key}=${tagValue(item.value)}`)
      .sort();
    return `m:default:${marker.groupId}:${entries.join(',')}`;
  }
  const entries = marker.overrides
    .map((item) => `${item.key}=${tagValue(item.value)}`)
    .sort();
  return `m:override:${marker.groupId}:${entries.join(',')}`;
};
