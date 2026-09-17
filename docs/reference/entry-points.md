---
navigation_title: Entry points
description: Root, emotion, and testing exports.
---

# Entry points

Runtime values are importable at runtime. Type-only names exist in `.d.ts` only.

## `@elastic/distillate`

```ts
import {
  createDistillery,
  combineClassNames,
  type Distillery,
  type DistilleryEnvironment,
  type StyleHandle,
} from '@elastic/distillate';
```

| Export | Kind | Role |
| ------ | ---- | ---- |
| `createDistillery` | runtime | Bind prefix and a theme tree. |
| `cssVarName` | runtime | `--${prefix}-${path}` with `/` joined on `-`; strips a leading `vars/`. |
| `lightDark` / `cq` | runtime | Theme-tree leaves. `cq` aliases `scaleToken`. |
| `zipSchemes` | runtime | Fold two per-scheme trees. Differing strings become `lightDark`. |
| `resolveThemeValues` | runtime | Nested literal values for one scheme. Prefer `distillery.resolveValues`. |
| `themeToken` / `scaleToken` / `contextualVar` | runtime | Token factories. Derivation calls `themeToken` / `scaleToken`. |
| `isCssToken` / `isScaleToken` / `isContextualCssVar` / `isContextualCssVarName` | runtime | Type guards. |
| `css` / `decls` / `rule` / `media` / `container` / `variants` / `mapDomain` | runtime | Authoring helpers (also on the `createStyleModule` factory argument). `mapDomain` has no collector side effect. |
| `combineClassNames` | runtime | `context.resolveClassName(...handles)`. |
| `StylesCollector` | runtime | Class; `artifactCollector` / `stylesheetCollector` return instances. |
| `renderStyles` | runtime | Unbound renderer; prefer `distillery.renderStyles`. |
| `createStyleNameResolver` | runtime | Standalone compact/readable name map. |
| `StyleRegistry` | runtime | Module registry class. |
| `Distillery` / `DistilleryOptions` / `DistilleryEnvironment` / `ThemeVarDefinition` | type | Bindings. |
| `TokensOf` / `ValuesOf` / `PathsOf` / `ThemeTree` / `SchemePair` / `ThemeVariation` / `ResolvedThemeVariation` / `ThemeAlternate` / `RenderStylesOptions` | type | Theme derivation and render selection. |
| `StyleHandle` / `StylesModule` / `StyleNameResolver` / `StyleNameMode` / `StyleTarget` | type | Handles, modules, naming. |

### Key signatures

```ts
createDistillery<const TTheme extends ThemeTree>(
  options: DistilleryOptions<TTheme>
): Distillery<TokensOf<TTheme>, TTheme>;

distillery.resolveValues(scheme: 'light' | 'dark', variation?: string): ValuesOf<TTheme>;

distillery.createStyleModule(name, ({ css, tokens }) => ({ ... }));
distillery.artifactCollector(names: 'compact' | 'readable'): StylesCollector;
distillery.stylesheetCollector(names?: 'compact' | 'readable'): StylesCollector;
distillery.renderStyles(
  collector: StylesCollector,
  resolver?: StyleNameResolver,
  options?: RenderStylesOptions
): string;

collector.use(module | entry | entries): void;
collector.useHandles(handles: readonly StyleHandle[]): void;
collector.createResolver(): StyleNameResolver;
```

Field-level environment types: [Environment](environment.md).

## `@elastic/distillate/emotion`

```ts
import {
  createEmotion,
  createDomSink,
  type Emotion,
} from '@elastic/distillate/emotion';

const { css, cx, injectGlobal, stylesheet, globalModules } = createEmotion(
  distillery,
  { sink: createDomSink({ document }) }
);
```

| Export | Kind | Role |
| ------ | ---- | ---- |
| `createEmotion` | runtime | `css` / `cx` / `injectGlobal` over the distillery registry. |
| `createDomSink` | runtime | One `<style>` element, flushed per turn. |
| `Emotion` / `EmotionCss` / `CreateEmotionOptions` / `StyleSink` | type | Return and option types. |
| `CreateDomSinkOptions` / `DocumentLike` / `StyleElementLike` | type | DOM sink surface. |

```ts
createEmotion(distillery, options?: { sink?: StyleSink }): Emotion;
createDomSink(options: { document: DocumentLike; schedule?: (flush: () => void) => void }): StyleSink;
```

The string form of a `css` template is readable and does not collect. The wrapper is still a `StyleHandle` for `useHandles` / `resolveClassName`.

## `@elastic/distillate/testing`

```ts callouts=false
import {
  assertVarRefsHaveDeclarations,
  findVarRefViolations,
  tokenTreeDts,
  type VarInvariantViolation,
} from '@elastic/distillate/testing';

findVarRefViolations(css: string): VarInvariantViolation[];
assertVarRefsHaveDeclarations(css: string): void; // throws on violations
```

| Export | Kind | Role |
| ------ | ---- | ---- |
| `findVarRefViolations` | runtime | Returns `{ reference, context }[]`. |
| `assertVarRefsHaveDeclarations` | runtime | Throws if any `var(...)` is undeclared in the same text. |
| `tokenTreeDts` | runtime | Emits a TypeScript `interface` for a derived token tree (Monaco extraLib). |
| `VarInvariantViolation` | type | `reference` plus nearby `context`. |

No `stylis` import. Safe to use from tests that must not pull the compiler.

Generated per-symbol docs are under [Generated API](api.md) after `pnpm docs:api`.
