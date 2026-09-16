/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertCssIdentSegment } from './idents';
import { cssVarName } from './names';
import type { ContextualVarPath, CssValue } from './styles/types';

const RESERVED_DEFAULT_KEYS = new Set(['set', 'toString', 'valueOf', 'toJSON']);

const isReservedKey = (key: string): boolean =>
  RESERVED_DEFAULT_KEYS.has(key) || key.startsWith('__');

/** Reference to a local CSS variable. Stringifies to `var(--...)`. */
export interface LocalVarRef {
  /** Brand distinguishing a local-var ref from other interpolations. */
  readonly __kind: 'local-var-ref';
  /** Canonical group/key path. */
  readonly path: ContextualVarPath;
  /** Actual emitted CSS custom property name. */
  readonly propName: `--${string}`;
  /** Usable CSS `var(...)` reference string. */
  readonly ref: `var(--${string})`;
  /** Stringifies to {@link LocalVarRef.ref}. */
  toString(): string;
  /** Template interpolation; same as {@link LocalVarRef.toString}. */
  [Symbol.toPrimitive](hint: string): string;
}

/** Interpolation marker representing `.set(...)` overrides. */
export interface LocalVarOverrideMarker {
  /** Brand distinguishing a `.set(...)` override marker. */
  readonly __kind: 'local-var-override-marker';
  /** Unique ID for the group. */
  readonly groupId: string;
  /** Ordered list of variable overrides. */
  readonly overrides: ReadonlyArray<{
    /** Variable key within the group. */
    readonly key: string;
    /** Canonical group/key path. */
    readonly path: ContextualVarPath;
    /** Actual emitted CSS custom property name. */
    readonly propName: `--${string}`;
    /** Override value written at this interpolation site. */
    readonly value: CssValue;
  }>;
}

/** Interpolation marker representing `${group}` defaults. */
export interface LocalVarDefaultMarker {
  /** Brand distinguishing a `${group}` default marker. */
  readonly __kind: 'local-var-default-marker';
  /** Unique ID for the group. */
  readonly groupId: string;
  /** Group prefix path. */
  readonly groupPath: `vars/${string}`;
  /** Ordered list of variable defaults. */
  readonly defaults: ReadonlyArray<{
    /** Variable key within the group. */
    readonly key: string;
    /** Canonical group/key path. */
    readonly path: ContextualVarPath;
    /** Actual emitted CSS custom property name. */
    readonly propName: `--${string}`;
    /** Default value emitted when this key is reachable. */
    readonly value: CssValue;
  }>;
}

/** Interpolation marker: `${group}` defaults or `${group.set(...)}` overrides. */
export type LocalVarMarker = LocalVarOverrideMarker | LocalVarDefaultMarker;

/**
 * Value returned by `t.vars(...)`. Interpolate `${group}`, `${group.key}`, or `${group.set({...})}`.
 */
export type LocalVarGroup<TKey extends string> = {
  readonly [P in TKey]: LocalVarRef;
} & {
  /** Builds a marker that writes the given keys at the interpolation site. */
  set(overrides: Partial<Record<TKey, CssValue>>): LocalVarOverrideMarker;
};

/** `true` when `value` is a {@link LocalVarRef}. */
export const isLocalVarRef = (value: unknown): value is LocalVarRef =>
  Boolean(
    value &&
    typeof value === 'object' &&
    (value as { __kind?: string }).__kind === 'local-var-ref'
  );

/** `true` when `value` is a {@link LocalVarDefaultMarker}. */
export const isLocalVarDefaultMarker = (
  value: unknown
): value is LocalVarDefaultMarker =>
  Boolean(
    value &&
    typeof value === 'object' &&
    (value as { __kind?: string }).__kind === 'local-var-default-marker'
  );

/** `true` when `value` is a {@link LocalVarOverrideMarker}. */
export const isLocalVarOverrideMarker = (
  value: unknown
): value is LocalVarOverrideMarker =>
  Boolean(
    value &&
    typeof value === 'object' &&
    (value as { __kind?: string }).__kind === 'local-var-override-marker'
  );

/** `true` when `value` is a {@link LocalVarDefaultMarker} or {@link LocalVarOverrideMarker}. */
export const isLocalVarMarker = (value: unknown): value is LocalVarMarker =>
  isLocalVarDefaultMarker(value) || isLocalVarOverrideMarker(value);

const cssVarPath = (
  moduleName: string,
  group: string,
  key: string
): ContextualVarPath => `vars/${moduleName}/${group}/${key}`;

const buildLocalVarRef = (
  path: ContextualVarPath,
  propName: `--${string}`
): LocalVarRef => {
  const ref: `var(--${string})` = `var(${propName})`;
  const refToString = (): string => ref;
  return {
    __kind: 'local-var-ref',
    path,
    propName,
    ref,
    toString: refToString,
    [Symbol.toPrimitive]: refToString,
  };
};

const reservedKeyError = (key: string): Error =>
  new Error(
    `t.vars(...) defaults key "${key}" is reserved. Reserved: ${[...RESERVED_DEFAULT_KEYS].join(', ')} plus any "__"-prefixed key.`
  );

export const createLocalVarGroup = <TKey extends string>(
  prefix: string,
  moduleName: string,
  group: string,
  defaults: Record<TKey, CssValue>
): LocalVarGroup<TKey> => {
  assertCssIdentSegment(group, 't.vars(...) group');
  const groupId = `${moduleName}/${group}`;
  const groupPath = `vars/${groupId}`;
  const refs = new Map<TKey, LocalVarRef>();
  const defaultsList: Array<{
    readonly key: string;
    readonly path: ContextualVarPath;
    readonly propName: `--${string}`;
    readonly value: CssValue;
  }> = [];

  for (const [key, value] of Object.entries(defaults) as Array<
    [TKey, CssValue]
  >) {
    if (isReservedKey(key)) {
      throw reservedKeyError(key);
    }
    assertCssIdentSegment(key, `t.vars("${group}") key`);
    const path = cssVarPath(moduleName, group, key);
    const propName = cssVarName(prefix, path);
    refs.set(key, buildLocalVarRef(path, propName));
    defaultsList.push({ key, path, propName, value });
  }

  const setOverrides = (
    overrides: Partial<Record<TKey, CssValue>>
  ): LocalVarOverrideMarker => {
    const list: Array<LocalVarOverrideMarker['overrides'][number]> = [];
    for (const [key, value] of Object.entries(overrides) as Array<
      [TKey, CssValue | undefined]
    >) {
      if (value === undefined) {
        continue;
      }
      const ref = refs.get(key);
      if (!ref) {
        throw new Error(
          `t.vars("${group}").set: unknown key "${key}". Declared keys: ${defaultsList
            .map((entry) => entry.key)
            .join(', ')}.`
        );
      }
      list.push({ key, path: ref.path, propName: ref.propName, value });
    }
    return {
      __kind: 'local-var-override-marker',
      groupId,
      overrides: list,
    };
  };

  const group_ = {
    __kind: 'local-var-default-marker',
    groupId,
    groupPath,
    defaults: defaultsList,
    set: setOverrides,
  } as unknown as LocalVarGroup<TKey>;

  for (const [key, ref] of refs) {
    Object.defineProperty(group_, key, {
      value: ref,
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }

  return group_;
};
