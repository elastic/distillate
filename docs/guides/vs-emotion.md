---
navigation_title: Distillate vs CSS-in-JS
description: When to use Distillate over Emotion, CSS Modules, static extraction, or Tailwind.
---

# Distillate vs CSS-in-JS

Distillate is a **component library authoring** tool. Emotion, CSS Modules, Tailwind, and vanilla-extract are primarily **application** tools. The audiences overlap, but the core problems differ.

## The positioning

Use Distillate when you need **both a public stylesheet and compact self-contained artifact payloads** from the same authored source — and the library must carry no design opinions of its own.

Use Emotion (or similar) when you are styling an **application directly** and have no need to export tree-shaken CSS alongside HTML.

## Distillate vs Emotion

Emotion generates class names at runtime by hashing template content and injecting `<style>` elements. Distillate records declarations once at module-construction time and emits CSS on demand through a collector.

| | Emotion | Distillate |
| --- | --- | --- |
| Primary audience | Application developers | Component library authors |
| Style authoring | `css\`...\`` at render time | `createStyleModule` once at module load |
| Runtime variation | New template → new class | CSS custom properties (`vars`, theme tokens) |
| Output modes | DOM injection | Stylesheet or compact artifact |
| Tree-shaking | No — all styles inject eagerly | Artifact collector drops unreached entries |
| Typed tokens | No | `lightDark`, `cq`, `vars` |
| Object styles | `css({ color: 'red' })` | Not supported |
| Keyframes | `keyframes\`...\`` | Not supported |
| `styled.*` | Yes (`@emotion/styled`) | No |
| Bundle constraint | Works in any bundle | One copy per runtime required |

The `@elastic/distillate/emotion` entry point is a drop-in surface (`css` / `cx` / `injectGlobal`) over the same registry. It lets you keep existing call sites while gaining the collector and artifact-export path. See [Migrate from Emotion](emotion-migration.md).

## When to use Distillate

- You ship a component library that exports **both** a loadable stylesheet (for apps) and self-contained HTML payloads (emails, AI reply cards, SVG renders, exported reports).
- You want typed design-token references (`tokens.colors.ink`) with pruning — unused tokens drop out of artifact CSS.
- You need the same styles in two name modes: human-readable for development, short-identifier compact when HTML and CSS travel together.
- You want to assert at test time that every `var(--...)` in emitted CSS has a matching declaration (`assertVarRefsHaveDeclarations`).

## When not to use Distillate

- **You need per-render dynamic class names.** Modules are static after construction. Put variation on CSS custom properties, not new templates per render.
- **You are building an application, not a library.** Distillate's artifact-export path has no value when styles never leave the host app.
- **You rely on `styled.*`, keyframes, `@supports`, or object styles.** These are unsupported.
- **Your bundle cannot guarantee a single copy at runtime.** See [Single-copy invariant](../concepts/single-copy.md). For plugin-host architectures (Kibana-style), the platform must expose Distillate as a shared dependency.

## Distillate vs CSS Modules

CSS Modules scope class names per file with a bundler plugin. They do not tree-shake unused declarations, have no typed token system, and cannot emit compact payloads. Choose CSS Modules for simple scoped styles in an application; choose Distillate for a library that needs typed tokens and artifact export.

## Distillate vs static extraction (Linaria / vanilla-extract)

Static extraction tools run at build time and produce real CSS files with zero runtime cost. The tradeoff: they cannot follow an actual render to determine which handles were reached. Distillate's artifact collection is a **runtime** side effect of resolving class names, which is the correct model when the emitted CSS must exactly match the rendered HTML tree.

Vanilla-extract offers typed token support similar to `createThemeContract`. Choose vanilla-extract if build-time extraction is a hard requirement or if runtime is forbidden (edge/serverless cold-start sensitive). Choose Distillate if artifact export or runtime reachability collection is required.

## Distillate vs Tailwind

Tailwind generates utility classes from a predefined scale. Distillate emits authored property blocks from tagged templates. They are not competing tools — a library can use Distillate internally while a host application uses Tailwind. The key difference: Tailwind cannot produce a compact, tree-shaken CSS payload tied to a specific render tree.
