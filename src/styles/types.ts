/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  LocalVarDefaultMarker,
  LocalVarGroup,
  LocalVarMarker,
  LocalVarOverrideMarker,
  LocalVarRef,
} from '../local_vars';
import type { SelectorAlternative } from '../nesting';
import type {
  ContextualCssVar,
  ContextualCssVarName,
  CssToken,
  ScaleToken,
} from '../tokens';

export type {
  LocalVarDefaultMarker,
  LocalVarGroup,
  LocalVarMarker,
  LocalVarOverrideMarker,
  LocalVarRef,
};

/** Canonical `vars/<group>/<key>` path for a contextual or module-local CSS variable. */
export type ContextualVarPath = `vars/${string}`;
/** Theme-token path or any other CSS-var key the resolver knows. */
export type CssVarPath = string;

/** Values accepted by `t.vars(...)` defaults and `.set(...)`. */
export type CssValue =
  | string
  | number
  | CssToken
  | ContextualCssVar
  | ContextualCssVarName
  | ScaleToken
  | LocalVarRef;

/** Reachability sets captured while authoring a declaration block. */
export interface StyleDeps {
  /** Theme-token paths interpolated into this block. */
  readonly theme: ReadonlySet<string>;
  /** Unconditional writes and reads. Default-marker keys land here only when reachable. */
  readonly vars: ReadonlySet<ContextualVarPath>;
  /** Read-side `var(...)` paths. Drives default-emission reachability. */
  readonly refs: ReadonlySet<ContextualVarPath>;
  /** `t.vars(...)` default-emission sites, resolved after collection. */
  readonly defaults: ReadonlyArray<DefaultGroupDeps>;
}

/** One `t.vars(...)` group's default-emission metadata. */
export interface DefaultGroupDeps {
  /** Target variable namespace group. */
  readonly groupPath: `vars/${string}`;
  /** Defaults registered within this group. */
  readonly keys: ReadonlyArray<DefaultKeyDeps>;
}

/** One key inside a {@link DefaultGroupDeps} group. */
export interface DefaultKeyDeps {
  /** The specific variable key within the group. */
  readonly key: string;
  /** Full CSS variable path (e.g. `vars/group/key`). */
  readonly path: ContextualVarPath;
  /** Theme/var paths referenced by the default value. Kept if the key is reachable. */
  readonly valueDeps: {
    /** Theme-token paths the default value interpolates. */
    readonly theme: ReadonlySet<string>;
    /** Contextual-var paths the default value interpolates. */
    readonly vars: ReadonlySet<ContextualVarPath>;
  };
}

/** Mutable twin of {@link StyleDeps} used while scanning interpolations. */
export interface MutableStyleDeps {
  /** Theme-token paths interpolated into this block. */
  theme: Set<string>;
  /** Unconditional writes and reads. */
  vars: Set<ContextualVarPath>;
  /** Read-side `var(...)` paths. */
  refs: Set<ContextualVarPath>;
  /** `t.vars(...)` default-emission sites. */
  defaults: DefaultGroupDeps[];
}

/** Literal CSS text or a local-var interpolation marker. */
export type DeclarationSegment = string | LocalVarMarker;

/** Authored CSS plus the deps the collector uses for reachability. */
export interface Declarations {
  /** Interleaved literal CSS and local variable markers. */
  readonly css: readonly DeclarationSegment[];
  /** Reachability tracking dependencies. */
  readonly deps: StyleDeps;
}

/** A named class: readable name, declarations, and collection identity. */
export interface StyleHandle {
  /** Discriminant for {@link StyleEntry}. */
  readonly kind: 'handle';
  /** The registered module name this handle belongs to. */
  readonly moduleName: string;
  /** Leaf key if at root, or composed path for nested handles. */
  readonly localName: string;
  /** Full path joined by dots. */
  readonly key: string;
  /** Predictable name used for output CSS classes. */
  readonly readableName: string;
  /** CSS properties for this handle. */
  readonly declarations: Declarations;
  /** `true` when produced inside `variants(...)`. Skipped by {@link index.StylesCollector#use | StylesCollector.use}. */
  readonly variant: boolean;
  /** Produces the final class name via the provided resolver context. */
  resolveClassName(context: {
    /** Joins one or more handles into a class-name string. */
    resolveClassName: (...handles: StyleHandle[]) => string;
  }): string;
}

/** A selector plus declarations, optionally auto-collected from handle deps. */
export interface StyleRule {
  /** Discriminant for {@link StyleEntry}. */
  readonly kind: 'rule';
  /** The registered module name this rule belongs to. */
  readonly moduleName: string;
  /** Unique key for this rule within the module. */
  readonly key: string;
  /** Selector string factory receiving a resolver for `&` and other handles. */
  readonly selector: (h: StyleSelectorResolver) => string;
  /** CSS properties for this rule. */
  readonly declarations: Declarations;
  /** `true` when produced inside `variants(...)`. */
  readonly variant: boolean;
  /** Handle keys this selector reads. Empty until `assignEntries` fills it. */
  readonly dependsOn: ReadonlySet<string>;
  /** When `false`, skip auto-collection; the caller must `use` the rule. */
  readonly auto: boolean;
}

/** Options for {@link rule}. */
export interface RuleOptions {
  /** When `false`, the collector must `use` this rule explicitly. Defaults to `true`. */
  auto?: boolean;
}

/** `@media` or `@container` block wrapping inner {@link StyleRule}s. */
export interface StyleMedia {
  /** Discriminant for {@link StyleEntry}. */
  readonly kind: 'media';
  /**
   * At-rule this entry emits. `kind` stays `'media'` so collector rank and deps apply uniformly; see finding `media-block-ordering`.
   */
  readonly atRule?: 'media' | 'container';
  /** Stable identity for deduplication across multiple renders. */
  readonly key: string;
  /** The registered module name this media block belongs to. */
  readonly moduleName: string;
  /** The conditional query (e.g. `(min-width: 600px)`). */
  readonly query: string;
  /** Inner rules collected inside this block. */
  readonly rules: readonly StyleRule[];
  /** `true` when produced inside `variants(...)`. */
  readonly variant: boolean;
}

/** One registered handle, selector rule, or at-rule block. */
export type StyleEntry = StyleHandle | StyleRule | StyleMedia;
/** Selector factory: call with a handle, or read sibling local names as `.class` strings. */
export type StyleSelectorResolver = ((handle: StyleHandle) => string) &
  Record<string, string>;

/** Named handle tree plus flat entries after `createStyleModule`. */
export interface StylesModule<TStyles = StylesObject> {
  /** The unique registered name of the module. */
  readonly name: string;
  /** Authored tree of handles, rules, and media; variants nest as records. */
  readonly handles: TStyles;
  /** Flat list of style entries (handles, rules, media) defined in this module. */
  readonly entries: readonly StyleEntry[];
  /** Flat list of just the style handles defined in this module. */
  readonly handleList: readonly StyleHandle[];
  /** Aggregated theme dependencies across all entries. */
  readonly themeDeps: ReadonlySet<string>;
  /** Aggregated variable dependencies across all entries. */
  readonly varDeps: ReadonlySet<ContextualVarPath>;
}

/** Authored module tree before {@link ResolvedStyles} substitution. */
export type StylesObject = Record<string, unknown>;
/** Class and CSS-var key snapshot used to build a {@link StyleNameResolver}. */
export interface StyleRegistrySnapshot {
  /** Collected readable class names from registered modules. */
  readonly classKeys: readonly string[];
  /** Collected custom property (CSS variable) keys. */
  readonly cssVarKeys: readonly CssVarPath[];
}

/** Resolves nested pending handles, rules, and medias into their runtime types. */
export type ResolvedStyles<TValue> = TValue extends PendingStyleHandle
  ? StyleHandle
  : TValue extends StyleRule
    ? StyleRule
    : TValue extends StyleMedia
      ? StyleMedia
      : TValue extends readonly (infer TItem)[]
        ? readonly ResolvedStyles<TItem>[]
        : TValue extends Record<string, unknown>
          ? { [TKey in keyof TValue]: ResolvedStyles<TValue[TKey]> }
          : TValue;

/** Authoring API passed to `createStyleModule` factories. */
export interface StyleAuthoringApi<TTokens = unknown> {
  /** Creates a handle template where nested `&` and `@media` flatten into sibling rules. */
  css: (
    strings: TemplateStringsArray,
    ...values: readonly unknown[]
  ) => PendingStyleHandle;
  /** Creates a declaration block template for direct CSS properties. */
  decls: (
    strings: TemplateStringsArray,
    ...values: readonly unknown[]
  ) => Declarations;
  /** Module-local CSS variable group. Interpolate `${group}`, `${group.key}`, or `${group.set({...})}`. */
  vars: <TKey extends string>(
    group: string,
    defaults: Record<TKey, CssValue>
  ) => LocalVarGroup<TKey>;
  /** Environment token tree. */
  tokens: TTokens;
}

/** Authoring-time handle before module registration rewrites it to a {@link StyleHandle}. */
export interface PendingStyleHandle {
  /** Discriminant for pending templates. */
  readonly kind: 'pending-handle';
  /** Declaration properties authored on this pending handle. */
  readonly declarations: Declarations;
  /** Nested `&` / `@media` rules expanded into sibling entries at registration. */
  readonly nested?: readonly PendingNested[];
}

/** Nested `&` rule captured on a pending handle. */
export interface PendingNestedRule {
  /** Discriminant for pending nested entries. */
  readonly kind: 'nested-rule';
  /** Comma alternatives relative to the parent handle. */
  readonly alternatives: readonly SelectorAlternative[];
  /** CSS properties for this nested rule. */
  readonly declarations: Declarations;
}

/** Nested `@media` captured on a pending handle. */
export interface PendingNestedMedia {
  /** Discriminant for pending nested entries. */
  readonly kind: 'nested-media';
  /** Media query text. */
  readonly query: string;
  /** Bare declarations inside the block, applied to the parent handle. */
  readonly self?: Declarations;
  /** Nested `&` rules inside this media block. */
  readonly rules: readonly PendingNestedRule[];
}

/** Nested `&` rule or `@media` on a pending handle. */
export type PendingNested = PendingNestedRule | PendingNestedMedia;

/** Pending handle or already-resolved rule/media during registration. */
export type PendingEntry = PendingStyleHandle | StyleRule | StyleMedia;

/** Narrow `t` for `primitiveStyles`: handles and tokens only. */
export interface PrimitiveStyleAuthoringApi<TTokens = unknown> {
  /** Creates named style handles using the same template tag as `css`. */
  style: StyleAuthoringApi<TTokens>['css'];
  /** Environment token tree. */
  tokens: TTokens;
}
