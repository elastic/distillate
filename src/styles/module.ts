/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DistilleryEnvironment } from '../environment';
import { assertCssIdentSegment } from '../idents';
import { createLocalVarGroup, type LocalVarGroup } from '../local_vars';
import { hasEntryKind } from '../tokens/kind';

import {
  composeSelector,
  css,
  decls,
  EMPTY_DEPS,
  isVariantMarked,
} from './authoring';
import type { StyleRegistry } from './registry';
import { createSelectorResolver } from './selector_resolver';
import type {
  ContextualVarPath,
  CssValue,
  PendingNested,
  PendingNestedRule,
  PendingStyleHandle,
  ResolvedStyles,
  StyleAuthoringApi,
  StyleDeps,
  StyleEntry,
  StyleHandle,
  StyleMedia,
  StyleRule,
  StylesModule,
  StylesObject,
} from './types';

export const createStyleModuleWithEnvironment = <
  TTokens,
  TStyles extends StylesObject,
>(
  environment: DistilleryEnvironment<TTokens>,
  registry: StyleRegistry,
  name: string,
  factory: (t: StyleAuthoringApi<TTokens>) => TStyles
): StylesModule<ResolvedStyles<TStyles>> => {
  assertCssIdentSegment(name, 'Style module name');
  const t = createAuthoringApi(environment, name);
  const authored = factory(t);
  const entries: StyleEntry[] = [];
  const handleList: StyleHandle[] = [];
  const themeDeps = new Set<string>();
  const varDeps = new Set<ContextualVarPath>();

  assignEntries(name, authored, [], entries, handleList, themeDeps, varDeps);
  recordRuleDeps(entries, handleList);

  const module: StylesModule<ResolvedStyles<TStyles>> = {
    name,
    handles: authored as ResolvedStyles<TStyles>,
    entries,
    handleList,
    themeDeps,
    varDeps,
  };
  registry.registerModule(module);
  return module;
};

const createAuthoringApi = <TTokens>(
  environment: DistilleryEnvironment<TTokens>,
  moduleName: string
): StyleAuthoringApi<TTokens> => ({
  css,
  decls,
  vars: <TKey extends string>(
    group: string,
    defaults: Record<TKey, CssValue>
  ): LocalVarGroup<TKey> =>
    createLocalVarGroup(environment.prefix, moduleName, group, defaults),
  tokens: environment.tokens,
});

const assignEntries = (
  moduleName: string,
  value: unknown,
  path: readonly string[],
  entries: StyleEntry[],
  handles: StyleHandle[],
  themeDeps: Set<string>,
  varDeps: Set<ContextualVarPath>,
  inheritedVariant = false
): unknown => {
  // Everything beneath a `variants(...)` record is a variant.
  const variantHere = inheritedVariant || isVariantMarked(value);

  if (isPendingHandle(value)) {
    const localName = path.join('/');
    const handle: StyleHandle = {
      kind: 'handle',
      moduleName,
      localName,
      key: `${moduleName}/${localName}`,
      readableName: `${moduleName}-${path.join('-')}`,
      declarations: value.declarations,
      variant: variantHere,
      resolveClassName: (context) => context.resolveClassName(handle),
    };
    entries.push(handle);
    handles.push(handle);
    copyDeps(value.declarations.deps, themeDeps, varDeps);
    if (value.nested && value.nested.length > 0) {
      expandNestedEntries(
        moduleName,
        handle,
        value.nested,
        variantHere,
        entries,
        themeDeps,
        varDeps
      );
    }
    return handle;
  }

  if (isRule(value)) {
    const keyedRule: StyleRule = {
      ...value,
      moduleName,
      key: `${moduleName}/${path.join('/')}`,
      variant: variantHere,
    };
    entries.push(keyedRule);
    copyDeps(value.declarations.deps, themeDeps, varDeps);
    return keyedRule;
  }

  if (isMedia(value)) {
    const mediaKey = `${moduleName}/${path.join('/')}`;
    const keyedMedia: StyleMedia = {
      ...value,
      key: mediaKey,
      moduleName,
      variant: variantHere,
      rules: value.rules.map((child, index) => ({
        ...child,
        moduleName,
        key: `${mediaKey}/${index}`,
        variant: variantHere,
      })),
    };
    entries.push(keyedMedia);
    for (const child of keyedMedia.rules) {
      copyDeps(child.declarations.deps, themeDeps, varDeps);
    }
    return keyedMedia;
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      assertCssIdentSegment(key, `Style module "${moduleName}" key`);
      const assigned = assignEntries(
        moduleName,
        child,
        [...path, key],
        entries,
        handles,
        themeDeps,
        varDeps,
        variantHere
      );
      if (assigned) {
        (value as Record<string, unknown>)[key] = assigned;
      }
    }
  }

  return value;
};

const MAX_NESTED_SIBLINGS = 1000;

// Zero-padded so `collectedEntries` (lexicographic sort) preserves source order past 9 siblings.
const paddedIndex = (index: number): string => {
  if (index >= MAX_NESTED_SIBLINGS) {
    throw new Error(
      `A single css template cannot have more than ${MAX_NESTED_SIBLINGS} nested blocks.`
    );
  }
  return String(index).padStart(3, '0');
};

const expandNestedEntries = (
  moduleName: string,
  self: StyleHandle,
  nested: readonly PendingNested[],
  variant: boolean,
  entries: StyleEntry[],
  themeDeps: Set<string>,
  varDeps: Set<ContextualVarPath>
): void => {
  nested.forEach((entry, index) => {
    const key = `${self.key}/&/${paddedIndex(index)}`;
    if (entry.kind === 'nested-rule') {
      entries.push(
        makeNestedRule(
          moduleName,
          key,
          self,
          entry,
          variant,
          themeDeps,
          varDeps
        )
      );
      return;
    }
    const rules: StyleRule[] = [];
    if (entry.self) {
      rules.push(
        makeNestedRule(
          moduleName,
          `${key}/${paddedIndex(0)}`,
          self,
          {
            kind: 'nested-rule',
            alternatives: [['&']],
            declarations: entry.self,
          },
          variant,
          themeDeps,
          varDeps
        )
      );
    }
    entry.rules.forEach((rule, ruleIndex) => {
      rules.push(
        makeNestedRule(
          moduleName,
          `${key}/${paddedIndex(ruleIndex + (entry.self ? 1 : 0))}`,
          self,
          rule,
          variant,
          themeDeps,
          varDeps
        )
      );
    });
    entries.push({
      kind: 'media',
      key,
      moduleName,
      query: entry.query,
      rules,
      variant,
    });
  });
};

const makeNestedRule = (
  moduleName: string,
  key: string,
  self: StyleHandle,
  rule: PendingNestedRule,
  variant: boolean,
  themeDeps: Set<string>,
  varDeps: Set<ContextualVarPath>
): StyleRule => {
  copyDeps(rule.declarations.deps, themeDeps, varDeps);
  return {
    kind: 'rule',
    moduleName,
    key,
    selector: composeSelector(rule.alternatives, self),
    declarations: rule.declarations,
    dependsOn: EMPTY_DEPS,
    auto: true,
    variant,
  };
};

const recordRuleDeps = (
  entries: readonly StyleEntry[],
  handles: readonly StyleHandle[]
): void => {
  if (entries.length === 0) {
    return;
  }
  for (const entry of entries) {
    if (entry.kind === 'rule') {
      assignDependsOn(entry, computeRuleDeps(entry, handles));
      continue;
    }
    if (entry.kind === 'media') {
      for (const nested of entry.rules) {
        assignDependsOn(nested, computeRuleDeps(nested, handles));
      }
    }
  }
};

const assignDependsOn = (
  rule: StyleRule,
  dependsOn: ReadonlySet<string>
): void => {
  (rule as { dependsOn: ReadonlySet<string> }).dependsOn = dependsOn;
};

const computeRuleDeps = (
  rule: StyleRule,
  handles: readonly StyleHandle[]
): ReadonlySet<string> => {
  const accessed = new Set<string>();
  const trackingResolver = createSelectorResolver(handles, (handle) => {
    accessed.add(handle.key);
    return handle.readableName;
  });
  try {
    rule.selector(trackingResolver);
  } catch {
    // A factory that throws on the tracking resolver keeps the deps recorded so far.
  }
  return accessed;
};

const copyDeps = (
  deps: StyleDeps,
  themeDeps: Set<string>,
  varDeps: Set<ContextualVarPath>
): void => {
  deps.theme.forEach((path) => themeDeps.add(path));
  deps.vars.forEach((path) => varDeps.add(path));
};

const isPendingHandle = (value: unknown): value is PendingStyleHandle =>
  hasEntryKind(value, 'pending-handle');

const isRule = (value: unknown): value is StyleRule =>
  hasEntryKind(value, 'rule');

const isMedia = (value: unknown): value is StyleMedia =>
  hasEntryKind(value, 'media');
