/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLocalVarOverrideMarker } from './local_vars';
import {
  createStyleNameResolver,
  type StyleNameMode,
  type StyleNameResolver,
  type StyleTarget,
} from './names';
import { isHandleLike } from './nesting';
import type {
  ContextualVarPath,
  CssVarPath,
  Declarations,
  DefaultGroupDeps,
  StyleEntry,
  StyleHandle,
  StyleHandleRef,
  StyleMedia,
  StyleRegistry,
  StyleRule,
  StylesModule,
} from './styles';
import { isEmptyDeclarations } from './styles/declarations';

const warnedHandles = new WeakSet<StyleHandle>();

const dependentEntriesCache = new WeakMap<
  StylesModule,
  Map<string, StyleEntry[]>
>();

const dependentEntries = (
  module: StylesModule,
  handleKey: string
): readonly StyleEntry[] => {
  let cached = dependentEntriesCache.get(module);
  if (!cached) {
    cached = new Map<string, StyleEntry[]>();
    for (const entry of module.entries) {
      if (entry.kind === 'rule') {
        if (!entry.auto) {
          continue;
        }
        for (const dep of entry.dependsOn) {
          appendDependent(cached, dep, entry);
        }
        continue;
      }
      if (entry.kind === 'media') {
        const deps = new Set<string>();
        for (const nested of entry.rules) {
          if (!nested.auto) {
            continue;
          }
          nested.dependsOn.forEach((key) => deps.add(key));
        }
        for (const dep of deps) {
          appendDependent(cached, dep, entry);
        }
      }
    }
    dependentEntriesCache.set(module, cached);
  }
  return cached.get(handleKey) ?? [];
};

const appendDependent = (
  cache: Map<string, StyleEntry[]>,
  key: string,
  entry: StyleEntry
): void => {
  const list = cache.get(key);
  if (list) {
    list.push(entry);
    return;
  }
  cache.set(key, [entry]);
};

/** Target, naming mode, registry, and prefix for one {@link StylesCollector}. */
export interface StylesCollectorOptions {
  /** Target context (e.g. `artifact` or `stylesheet`). */
  target: StyleTarget;
  /** Desired name mode (`compact` or `readable`). */
  names: StyleNameMode;
  /** Registry modules were authored against; used for auto-collection and compact-name snapshots. */
  registry: StyleRegistry;
  /** Brand prefix forwarded to the name resolver. */
  prefix: string;
  /** When `true`, emit no-op-handle warnings through `warn`. Inherited from `createDistillery({ dev })`. */
  dev?: boolean;
  /** Warning sink for no-op handles. Used only when `dev` is `true`. Defaults to `console.warn`. */
  warn?: (message: string) => void;
}

/** Reachable entries for one render or one stylesheet. */
export class StylesCollector {
  /** The target collection mode. */
  readonly target: StyleTarget;
  /** The naming mode (compact vs readable). */
  readonly names: StyleNameMode;
  /** Associated registry. */
  readonly registry: StyleRegistry;
  /** Emitted class name prefix. */
  readonly prefix: string;
  private readonly dev: boolean;
  private readonly warn: (message: string) => void;
  private readonly entries = new Map<string, StyleEntry>();
  private readonly handles = new Map<string, StyleHandle>();
  // Handles `useHandles` has fully processed since the last mutation.
  private readonly settledHandles = new Set<StyleHandle>();
  private readonly themeDeps = new Set<string>();
  private readonly varDeps = new Set<ContextualVarPath>();
  private readonly listeners = new Set<() => void>();
  private depth = 0;
  private dirty = false;
  private finalized: FinalizedDeps | undefined;

  constructor({
    target,
    names,
    registry,
    prefix,
    dev = false,
    warn = (message) => console.warn(message),
  }: StylesCollectorOptions) {
    this.target = target;
    this.names = names;
    this.registry = registry;
    this.prefix = prefix;
    this.dev = dev;
    this.warn = warn;
  }

  /**
   * Collects a module's non-variant entries, or one explicit entry.
   *
   * Variant entries stay off this path; collect them via `useHandles`.
   *
   * @param value Module (all non-variant entries), a single entry, or an array of entries.
   */
  use(value: StylesModule | StyleEntry | readonly StyleEntry[]): void {
    this.batch(() => this.useValue(value));
  }

  private useValue(
    value: StylesModule | StyleEntry | readonly StyleEntry[]
  ): void {
    if (isReadonlyArray(value)) {
      value.forEach((entry) => this.use(entry));
      return;
    }

    if (isStylesModule(value)) {
      // Variant entries' deps would claim compact names for handles never rendered.
      for (const entry of value.entries) {
        if (entry.variant) {
          continue;
        }
        if (entry.kind === 'handle' && !this.retainHandle(entry)) {
          continue;
        }
        this.setEntry(entry);
        if (entry.kind === 'handle' || entry.kind === 'rule') {
          this.addDeclarationDeps(entry.declarations);
        } else {
          for (const inner of entry.rules) {
            this.addDeclarationDeps(inner.declarations);
          }
        }
      }
      for (const handle of value.handleList) {
        if (handle.variant) {
          continue;
        }
        if (!this.retainHandle(handle)) {
          continue;
        }
        this.setHandle(handle);
      }
      return;
    }

    this.addEntry(value);
  }

  /**
   * Collects every entry on `module`, including variants. Used by the stylesheet target.
   *
   * @param module Module whose entries should all be collected.
   */
  useAllEntries(module: StylesModule): void {
    this.batch(() => {
      for (const entry of module.entries) {
        if (entry.kind === 'handle' && !this.retainHandle(entry)) {
          continue;
        }
        this.setEntry(entry);
      }
      for (const handle of module.handleList) {
        if (!this.retainHandle(handle)) {
          continue;
        }
        this.setHandle(handle);
      }
      this.addDeps(module.themeDeps, module.varDeps);
    });
  }

  /**
   * Collects handles and auto-includes rules whose selector deps are all present.
   *
   * Media blocks gain inner rules whose deps are met and keep rules already collected.
   *
   * @param handles Handles resolved during this render pass (e.g. from `resolveClassName`). A bare `{ key }` resolves through the registry.
   * @returns Handles that were retained. Empty untargeted handles are omitted in compact mode.
   * @throws If a `{ key }` names no handle registered with this collector's registry.
   */
  useHandles(handles: readonly StyleHandleRef[]): readonly StyleHandle[] {
    return this.batch(() => {
      let added = false;
      const retained: StyleHandle[] = [];
      let pending: StyleHandle[] = [];
      for (const ref of handles) {
        const handle = this.resolveHandle(ref);
        if (this.settledHandles.has(handle)) {
          retained.push(handle);
          continue;
        }
        if (!this.retainHandle(handle)) {
          continue;
        }
        retained.push(handle);
        pending.push(handle);
        if (this.handles.has(handle.key)) {
          continue;
        }
        added = true;
        this.setEntry(handle);
        this.setHandle(handle);
        this.addDeclarationDeps(handle.declarations);
      }
      // A later handle may complete deps for a skipped one, so rescan them all.
      if (added) {
        pending = retained;
      }
      for (const handle of pending) {
        const module = this.registry.module(handle.moduleName);
        if (!module) {
          continue;
        }
        for (const dependent of dependentEntries(module, handle.key)) {
          this.tryActivateDependent(dependent);
        }
      }
      for (const handle of pending) {
        this.settledHandles.add(handle);
      }
      return retained;
    });
  }

  /** Collects `auto` rules on `module` whose every selector dependency is already collected. */
  useRulesWhenDepsMet(module: StylesModule): void {
    this.batch(() => {
      for (const entry of module.entries) {
        if (entry.kind !== 'rule') {
          continue;
        }
        if (this.entries.has(entryKey(entry))) {
          continue;
        }
        if (this.allDepsMet(entry.dependsOn)) {
          this.addEntry(entry);
        }
      }
    });
  }

  /**
   * Calls `listener` after a public mutation adds an entry, handle, theme var, or contextual var.
   *
   * Fires at most once per outermost call; nested calls such as `use([a, b])` batch into it.
   *
   * @param listener Called with no arguments after the collection grows.
   * @returns Unsubscribes `listener`.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private tryActivateDependent(entry: StyleEntry): void {
    if (entry.kind === 'rule') {
      if (!entry.auto) {
        return;
      }
      if (this.entries.has(entryKey(entry))) {
        return;
      }
      if (!this.allDepsMet(entry.dependsOn)) {
        return;
      }
      this.addEntry(entry);
      return;
    }
    if (entry.kind === 'media') {
      // Add newly live rules; keep rules already collected (e.g. by `use`).
      const existing = this.entries.get(entryKey(entry));
      const collected = new Set<StyleRule>(
        existing?.kind === 'media' ? existing.rules : []
      );
      const rules = entry.rules.filter(
        (rule) =>
          collected.has(rule) || (rule.auto && this.allDepsMet(rule.dependsOn))
      );
      if (rules.length === collected.size) {
        return;
      }
      const filtered: StyleMedia =
        rules.length === entry.rules.length ? entry : { ...entry, rules };
      this.setEntry(filtered);
      for (const rule of rules) {
        this.addDeclarationDeps(rule.declarations);
      }
    }
  }

  // A full handle passes through unchanged, even from another distillery.
  private resolveHandle(ref: StyleHandleRef): StyleHandle {
    if (isHandleLike(ref)) {
      return ref;
    }
    const handle = this.registry.handle(ref.key);
    if (!handle) {
      throw new Error(
        `Unknown style handle key "${ref.key}". Register its module with this distillery before collecting it.`
      );
    }
    return handle;
  }

  private allDepsMet(dependsOn: ReadonlySet<string>): boolean {
    for (const dep of dependsOn) {
      if (!this.handles.has(dep)) {
        return false;
      }
    }
    return true;
  }

  /** Marks a theme token path as reachable so it appears in the emitted theme block, even if no collected declaration reads it. */
  useThemeVar(path: string): void {
    this.batch(() => this.addDeps([path], []));
  }

  /** Creates a {@link StyleNameResolver} scoped to this collector's current dep set. */
  createResolver(): StyleNameResolver {
    const finalized = this.finalizeDeps();
    const snapshot = this.registry.freeze({
      classKeys:
        this.names === 'compact'
          ? [...this.handles.keys()]
          : this.registry.classKeys,
      cssVarKeys: cssVarKeysFrom(finalized),
    });
    return createStyleNameResolver({
      names: this.names,
      prefix: this.prefix,
      classKeys: snapshot.classKeys,
      cssVarKeys: snapshot.cssVarKeys,
    });
  }

  /** Collected style entries sorted for emission (base rules before all `@media`/`@container` blocks). */
  get collectedEntries(): readonly StyleEntry[] {
    return [...this.entries.values()].sort(compareEntriesForEmission);
  }

  /** Theme token paths that survive reachability; emitted in the theme scope block. */
  get collectedThemeDeps(): ReadonlySet<string> {
    return this.finalizeDeps().theme;
  }

  /** Contextual var paths that survive reachability; used by the runtime for compact-name substitution. */
  get collectedVarDeps(): ReadonlySet<ContextualVarPath> {
    return this.finalizeDeps().vars;
  }

  /**
   * Returns the variable keys within `groupPath` that are reachable from `handle` or from any collected rule targeting it.
   *
   * @param handle Handle whose declaration refs and dependent rules are consulted.
   * @param groupPath Group prefix path (e.g. `vars/chip/look`).
   */
  reachableDefaults(
    handle: StyleHandle,
    groupPath: `vars/${string}`
  ): ReadonlySet<string> {
    const groupPrefix = `${groupPath}/`;
    const reachable = new Set<string>();
    const harvest = (refs: ReadonlySet<ContextualVarPath>): void => {
      for (const path of refs) {
        if (path.startsWith(groupPrefix)) {
          reachable.add(path.slice(groupPrefix.length));
        }
      }
    };

    harvest(handle.declarations.deps.refs);

    for (const entry of this.entries.values()) {
      if (entry.kind === 'rule') {
        if (entry.dependsOn.has(handle.key)) {
          harvest(entry.declarations.deps.refs);
        }
        continue;
      }
      if (entry.kind === 'media') {
        for (const innerRule of entry.rules) {
          if (innerRule.dependsOn.has(handle.key)) {
            harvest(innerRule.declarations.deps.refs);
          }
        }
      }
    }

    return reachable;
  }

  // Cached until entries, handles, or deps change.
  private finalizeDeps(): FinalizedDeps {
    this.finalized ??= this.computeFinalizedDeps();
    return this.finalized;
  }

  private computeFinalizedDeps(): FinalizedDeps {
    const theme = new Set<string>(this.themeDeps);
    const vars = new Set<ContextualVarPath>(this.varDeps);

    for (const handle of this.handles.values()) {
      for (const group of handle.declarations.deps.defaults) {
        const reachable = this.reachableDefaults(handle, group.groupPath);
        for (const item of group.keys) {
          if (!reachable.has(item.key)) {
            continue;
          }
          vars.add(item.path);
          item.valueDeps.theme.forEach((path) => theme.add(path));
          item.valueDeps.vars.forEach((path) => vars.add(path));
        }
      }
    }

    // Rules have no host handle for reachability, so every default key counts, as at render.
    for (const entry of this.entries.values()) {
      if (entry.kind === 'rule') {
        includeAllDefaults(entry.declarations.deps.defaults, theme, vars);
        continue;
      }
      if (entry.kind === 'media') {
        for (const inner of entry.rules) {
          includeAllDefaults(inner.declarations.deps.defaults, theme, vars);
        }
      }
    }

    return { theme, vars };
  }

  private retainHandle(handle: StyleHandle): boolean {
    if (!isEmptyDeclarations(handle.declarations)) {
      return true;
    }
    if (this.registry.targetsHandle(handle.key)) {
      return true;
    }
    if (this.dev && !warnedHandles.has(handle)) {
      warnedHandles.add(handle);
      this.warn(
        `Style module "${handle.moduleName}" handle "${handle.localName}" has no declarations and no rule targets it; delete the empty template.`
      );
    }
    return this.names !== 'compact';
  }

  private addEntry(entry: StyleEntry): void {
    if (entry.kind === 'handle' && !this.retainHandle(entry)) {
      return;
    }
    this.setEntry(entry);
    if (entry.kind === 'handle') {
      this.setHandle(entry);
      this.addDeclarationDeps(entry.declarations);
      return;
    }
    if (entry.kind === 'rule') {
      this.addDeclarationDeps(entry.declarations);
      return;
    }
    for (const rule of entry.rules) {
      this.addDeclarationDeps(rule.declarations);
    }
  }

  private addDeclarationDeps(declarations: Declarations): void {
    this.addDeps(declarations.deps.theme, declarations.deps.vars);
  }

  private addDeps(
    theme: Iterable<string>,
    vars: Iterable<ContextualVarPath>
  ): void {
    const before = this.themeDeps.size + this.varDeps.size;
    for (const path of theme) {
      this.themeDeps.add(path);
    }
    for (const path of vars) {
      this.varDeps.add(path);
    }
    if (this.themeDeps.size + this.varDeps.size !== before) {
      this.touch(true);
    }
  }

  // A media entry changes when it gains inner rules.
  private setEntry(entry: StyleEntry): void {
    const key = entryKey(entry);
    const existing = this.entries.get(key);
    if (existing === entry) {
      return;
    }
    this.entries.set(key, entry);
    this.touch(
      !existing ||
        (existing.kind === 'media' &&
          entry.kind === 'media' &&
          existing.rules.length !== entry.rules.length)
    );
  }

  private setHandle(handle: StyleHandle): void {
    const existing = this.handles.get(handle.key);
    if (existing === handle) {
      return;
    }
    this.handles.set(handle.key, handle);
    this.touch(!existing);
  }

  /** Every mutation funnels through here: caches drop, and growth queues the listeners. */
  private touch(grew: boolean): void {
    this.finalized = undefined;
    this.settledHandles.clear();
    if (grew) {
      this.dirty = true;
    }
  }

  // Listeners run once the outermost public mutation returns.
  private batch<T>(mutate: () => T): T {
    this.depth += 1;
    try {
      return mutate();
    } finally {
      this.depth -= 1;
      if (this.depth === 0 && this.dirty) {
        this.dirty = false;
        for (const listener of [...this.listeners]) {
          listener();
        }
      }
    }
  }
}

interface FinalizedDeps {
  readonly theme: ReadonlySet<string>;
  readonly vars: ReadonlySet<ContextualVarPath>;
}

const includeAllDefaults = (
  defaults: ReadonlyArray<DefaultGroupDeps>,
  theme: Set<string>,
  vars: Set<ContextualVarPath>
): void => {
  for (const group of defaults) {
    for (const item of group.keys) {
      vars.add(item.path);
      item.valueDeps.theme.forEach((path) => theme.add(path));
      item.valueDeps.vars.forEach((path) => vars.add(path));
    }
  }
};

const cssVarKeysFrom = (finalized: {
  theme: ReadonlySet<string>;
  vars: ReadonlySet<ContextualVarPath>;
}): readonly CssVarPath[] => {
  const keys = new Set<CssVarPath>();
  finalized.theme.forEach((path) => keys.add(path));
  finalized.vars.forEach((path) => keys.add(path));
  return [...keys].sort();
};

const entryKey = (entry: StyleEntry): string => {
  if (entry.kind === 'media') {
    return `media/${entry.key}`;
  }
  return entry.key;
};

const mediaSortRank = (entry: StyleEntry): number =>
  entry.kind === 'media' ? 1 : 0;

const localVarOverrideRank = (entry: StyleEntry): number => {
  if (entry.kind === 'media') {
    return 0;
  }
  return entry.declarations.css.some(isLocalVarOverrideMarker) ? 1 : 0;
};

// Base entries precede every at-rule block, which adds no specificity. Override markers follow default markers so a stacked override class wins.
const compareEntriesForEmission = (a: StyleEntry, b: StyleEntry): number => {
  const rankDelta = mediaSortRank(a) - mediaSortRank(b);
  if (rankDelta !== 0) {
    return rankDelta;
  }
  const varDelta = localVarOverrideRank(a) - localVarOverrideRank(b);
  if (varDelta !== 0) {
    return varDelta;
  }
  if (a.moduleName !== b.moduleName) {
    return a.moduleName.localeCompare(b.moduleName);
  }
  return a.key.localeCompare(b.key);
};

const isReadonlyArray = <T>(value: unknown): value is readonly T[] =>
  Array.isArray(value);

const isStylesModule = (
  value: StylesModule | StyleHandle | StyleRule | StyleMedia
): value is StylesModule => 'handles' in value && 'handleList' in value;
