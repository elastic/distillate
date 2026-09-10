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

import type { DistilleryEnvironment } from '../environment';
import { cssVarName } from '../names';

import type {
  ContextualVarPath,
  CssVarPath,
  Declarations,
  StyleRegistrySnapshot,
  StylesModule,
} from './types';

/**
 * Registered style modules for one distillery. Throws on duplicate module names or colliding readable class/var names.
 */
export class StyleRegistry {
  private readonly modulesByName = new Map<string, StylesModule>();

  constructor(
    private readonly prefix: string,
    private readonly reservedVarOwners: ReadonlyMap<string, string> = new Map(),
    private readonly sharedVarPaths: ReadonlySet<string> = new Set()
  ) {}

  /**
   * Adds `module` to this registry.
   *
   * @throws If another module already uses this name, or if a readable class or CSS-variable name collides (including `themeVars` and `sharedVars`).
   */
  registerModule(module: StylesModule): void {
    const existing = this.modulesByName.get(module.name);
    if (existing === module) {
      return;
    }
    if (existing) {
      throw new Error(`Style module "${module.name}" is already registered.`);
    }
    assertReadableNameCollisions(
      this.prefix,
      this.reservedVarOwners,
      this.sharedVarPaths,
      this.modulesByName.values(),
      module
    );
    this.modulesByName.set(module.name, module);
  }

  /** Registered modules, sorted by name. */
  get modules(): readonly StylesModule[] {
    return [...this.modulesByName.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  /** Looks up a module by the name passed to `createStyleModule`. */
  module(name: string): StylesModule | undefined {
    return this.modulesByName.get(name);
  }

  /** Handle keys across all modules. Compact-name domain for a full stylesheet. */
  get classKeys(): readonly string[] {
    return this.modules.flatMap((module) =>
      module.handleList.map((handle) => handle.key)
    );
  }

  /** Theme and contextual-var keys across all modules. */
  get cssVarKeys(): readonly CssVarPath[] {
    const keys = new Set<CssVarPath>();
    for (const module of this.modules) {
      module.themeDeps.forEach((path) => keys.add(path));
      module.varDeps.forEach((path) => keys.add(path));
    }
    return [...keys].sort();
  }

  /**
   * Frozen class and CSS-var keys for a {@link StyleNameResolver}.
   *
   * @param options Overrides the registry-wide key sets when compact-naming a subset.
   */
  freeze(
    options: {
      /** Compact class-name domain override. */
      classKeys?: Iterable<string>;
      /** Compact CSS-var domain override. */
      cssVarKeys?: Iterable<CssVarPath>;
    } = {}
  ): StyleRegistrySnapshot {
    return Object.freeze({
      classKeys: Object.freeze(
        sortedUnique(options.classKeys ?? this.classKeys)
      ),
      cssVarKeys: Object.freeze(
        sortedUnique(options.cssVarKeys ?? this.cssVarKeys)
      ),
    });
  }
}

const sortedUnique = <TValue extends string>(
  values: Iterable<TValue>
): readonly TValue[] => [...new Set(values)].sort();

const claimReadableVar = (
  owners: Map<string, string>,
  name: string,
  owner: string
): void => {
  const prior = owners.get(name);
  if (prior) {
    throw new Error(
      `Readable CSS variable "${name}" collides between ${prior} and ${owner}.`
    );
  }
  owners.set(name, owner);
};

/** Claimed readable custom-property name and the owner that registered it. */
interface ReadableLocalVarOwner {
  /** Canonical variable path. */
  readonly path: ContextualVarPath;
  /** Human-readable owner used in collision errors. */
  readonly owner: string;
}

/** Readable custom-property names already claimed by `themeVars` / `sharedVars`. */
export const readableVarOwnersFromEnvironment = (
  environment: Pick<
    DistilleryEnvironment,
    'prefix' | 'themeVars' | 'sharedVars'
  >
): ReadonlyMap<string, string> => {
  const owners = new Map<string, string>();
  const { prefix } = environment;
  for (const path of Object.keys(environment.themeVars)) {
    claimReadableVar(owners, cssVarName(prefix, path), `theme var "${path}"`);
  }
  for (const path of environment.sharedVars ?? []) {
    claimReadableVar(owners, cssVarName(prefix, path), `shared var "${path}"`);
  }
  return owners;
};

const assertReadableNameCollisions = (
  prefix: string,
  reservedVarOwners: ReadonlyMap<string, string>,
  sharedVarPaths: ReadonlySet<string>,
  existing: Iterable<StylesModule>,
  incoming: StylesModule
): void => {
  const classOwners = new Map<string, string>();
  const reservedOwners = new Map(reservedVarOwners);
  const localVarOwners = new Map<string, ReadableLocalVarOwner>();
  const index = (module: StylesModule): void => {
    for (const handle of module.handleList) {
      const prior = classOwners.get(handle.readableName);
      if (prior) {
        throw new Error(
          `Readable class name "${handle.readableName}" collides between ${prior} and module "${module.name}" handle "${handle.localName}".`
        );
      }
      classOwners.set(
        handle.readableName,
        `module "${module.name}" handle "${handle.localName}"`
      );
    }
    for (const path of localVarPathsOf(module, sharedVarPaths)) {
      const name = cssVarName(prefix, path);
      const owner = `module "${module.name}" var "${path}"`;
      const reserved = reservedOwners.get(name);
      if (reserved) {
        throw new Error(
          `Readable CSS variable "${name}" collides between ${reserved} and ${owner}.`
        );
      }
      const prior = localVarOwners.get(name);
      if (prior && prior.path !== path) {
        throw new Error(
          `Readable CSS variable "${name}" collides between ${prior.owner} and ${owner}.`
        );
      }
      localVarOwners.set(name, { path, owner });
    }
  };
  for (const module of existing) {
    index(module);
  }
  index(incoming);
};

// `deps.vars` records every contextual var a module *references*, which includes
// shared ones the module does not own. A shared path synthesizes the same
// readable name as a local var would, so leaving them in makes two modules that
// merely reference one shared var collide on it. The same exclusion is applied
// when compaction maps readable names to compact ones.
const localVarPathsOf = (
  module: StylesModule,
  sharedVarPaths: ReadonlySet<string>
): readonly ContextualVarPath[] => {
  const paths = new Set<ContextualVarPath>();
  const addFrom = (declarations: Declarations): void => {
    declarations.deps.vars.forEach((path) => {
      if (!sharedVarPaths.has(path)) {
        paths.add(path);
      }
    });
    for (const group of declarations.deps.defaults) {
      for (const item of group.keys) {
        paths.add(item.path);
      }
    }
  };
  for (const entry of module.entries) {
    if (entry.kind === 'handle' || entry.kind === 'rule') {
      addFrom(entry.declarations);
    } else {
      for (const nested of entry.rules) {
        addFrom(nested.declarations);
      }
    }
  }
  return [...paths];
};
