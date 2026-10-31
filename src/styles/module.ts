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

import { composeSelector, css, decls, isVariantMarked } from './authoring';
import type { StyleRegistry } from './registry';
import { createSelectorResolver } from './selector_resolver';
import type {
  ContextualVarPath,
  CssValue,
  Declarations,
  PendingNested,
  PendingNestedRule,
  PendingStyleHandle,
  ResolvedStyles,
  StyleAuthoringApi,
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
  const builder: ModuleBuilder = {
    moduleName: name,
    entries: [],
    handleList: [],
    themeDeps: new Set(),
    varDeps: new Set(),
    ruleDeps: [],
  };

  assignEntries(builder, authored, []);
  for (const { rule, dependsOn } of builder.ruleDeps) {
    trackRuleDeps(rule, builder.handleList, dependsOn);
  }

  const { entries, handleList, themeDeps, varDeps } = builder;
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

/** Accumulators for one module under construction. */
interface ModuleBuilder {
  readonly moduleName: string;
  readonly entries: StyleEntry[];
  readonly handleList: StyleHandle[];
  readonly themeDeps: Set<string>;
  readonly varDeps: Set<ContextualVarPath>;
  /** Each keyed rule with the set behind its `dependsOn`, filled once every handle exists. */
  readonly ruleDeps: Array<{ rule: StyleRule; dependsOn: Set<string> }>;
}

const assignEntries = (
  builder: ModuleBuilder,
  value: unknown,
  path: readonly string[],
  inheritedVariant = false
): unknown => {
  const { moduleName, entries, handleList } = builder;
  // Everything beneath a `variants(...)` record is a variant.
  const variantHere = inheritedVariant || isVariantMarked(value);
  const key = `${moduleName}/${path.join('/')}`;

  if (isPendingHandle(value)) {
    const handle: StyleHandle = {
      kind: 'handle',
      moduleName,
      localName: path.join('/'),
      key,
      readableName: `${moduleName}-${path.join('-')}`,
      declarations: value.declarations,
      variant: variantHere,
      resolveClassName: (context) => context.resolveClassName(handle),
    };
    entries.push(handle);
    handleList.push(handle);
    addDeclarationDeps(builder, value.declarations);
    if (value.nested && value.nested.length > 0) {
      expandNestedEntries(builder, handle, value.nested, variantHere);
    }
    return handle;
  }

  if (isRule(value)) {
    const keyedRule = buildRule(builder, key, variantHere, value);
    entries.push(keyedRule);
    return keyedRule;
  }

  if (isMedia(value)) {
    const keyedMedia: StyleMedia = {
      ...value,
      key,
      moduleName,
      variant: variantHere,
      rules: value.rules.map((child, index) =>
        buildRule(builder, `${key}/${index}`, variantHere, child)
      ),
    };
    entries.push(keyedMedia);
    return keyedMedia;
  }

  if (value && typeof value === 'object') {
    for (const [childKey, child] of Object.entries(value)) {
      assertCssIdentSegment(childKey, `Style module "${moduleName}" key`);
      const assigned = assignEntries(
        builder,
        child,
        [...path, childKey],
        variantHere
      );
      if (assigned) {
        (value as Record<string, unknown>)[childKey] = assigned;
      }
    }
  }

  return value;
};

/** Keys a rule into the module with a fresh `dependsOn`, filled by {@link trackRuleDeps} after the walk. */
const buildRule = (
  builder: ModuleBuilder,
  key: string,
  variant: boolean,
  {
    selector,
    declarations,
    auto,
  }: Pick<StyleRule, 'selector' | 'declarations' | 'auto'>
): StyleRule => {
  const dependsOn = new Set<string>();
  const rule: StyleRule = {
    kind: 'rule',
    moduleName: builder.moduleName,
    key,
    selector,
    declarations,
    variant,
    dependsOn,
    auto,
  };
  builder.ruleDeps.push({ rule, dependsOn });
  addDeclarationDeps(builder, declarations);
  return rule;
};

const addDeclarationDeps = (
  builder: ModuleBuilder,
  declarations: Declarations
): void => {
  const { theme, vars } = declarations.deps;
  theme.forEach((path) => builder.themeDeps.add(path));
  vars.forEach((path) => builder.varDeps.add(path));
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
  builder: ModuleBuilder,
  self: StyleHandle,
  nested: readonly PendingNested[],
  variant: boolean
): void => {
  nested.forEach((entry, index) => {
    const key = `${self.key}/&/${paddedIndex(index)}`;
    if (entry.kind === 'nested-rule') {
      builder.entries.push(makeNestedRule(builder, key, self, entry, variant));
      return;
    }
    const rules: StyleRule[] = [];
    if (entry.self) {
      rules.push(
        makeNestedRule(
          builder,
          `${key}/${paddedIndex(0)}`,
          self,
          {
            kind: 'nested-rule',
            alternatives: [['&']],
            declarations: entry.self,
          },
          variant
        )
      );
    }
    entry.rules.forEach((rule, ruleIndex) => {
      rules.push(
        makeNestedRule(
          builder,
          `${key}/${paddedIndex(ruleIndex + (entry.self ? 1 : 0))}`,
          self,
          rule,
          variant
        )
      );
    });
    builder.entries.push({
      kind: 'media',
      key,
      moduleName: builder.moduleName,
      query: entry.query,
      rules,
      variant,
    });
  });
};

const makeNestedRule = (
  builder: ModuleBuilder,
  key: string,
  self: StyleHandle,
  rule: PendingNestedRule,
  variant: boolean
): StyleRule =>
  buildRule(builder, key, variant, {
    selector: composeSelector(rule.alternatives, self),
    declarations: rule.declarations,
    auto: true,
  });

/** Runs the selector against a tracking resolver and records every handle key it reads into `into`. */
const trackRuleDeps = (
  rule: StyleRule,
  handles: readonly StyleHandle[],
  into: Set<string>
): void => {
  const trackingResolver = createSelectorResolver(handles, (handle) => {
    into.add(handle.key);
    return handle.readableName;
  });
  try {
    rule.selector(trackingResolver);
  } catch {
    // A factory that throws on the tracking resolver keeps the deps recorded so far.
  }
};

const isPendingHandle = (value: unknown): value is PendingStyleHandle =>
  hasEntryKind(value, 'pending-handle');

const isRule = (value: unknown): value is StyleRule =>
  hasEntryKind(value, 'rule');

const isMedia = (value: unknown): value is StyleMedia =>
  hasEntryKind(value, 'media');
