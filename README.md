<!-- markdownlint-disable MD033 -->
<p align="center">
  <img src="docs/logo.svg" alt="Distillate" width="96" height="96">
</p>
<h1 align="center">@elastic/distillate</h1>
<p align="center"><strong>distillate</strong> <i>n.</i> — concentrated CSS; the pure, fractionated styles extracted for a render.</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@elastic/distillate"><img src="https://img.shields.io/npm/v/@elastic/distillate.svg" alt="npm version"></a>
  <a href="https://github.com/elastic/distillate/actions/workflows/ci.yml"><img src="https://github.com/elastic/distillate/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/elastic/distillate/blob/main/LICENSE.txt"><img src="https://img.shields.io/badge/License-Elastic%202.0-blue.svg" alt="License: Elastic License 2.0"></a>
</p>
<!-- markdownlint-enable MD033 -->

A small, theme-agnostic engine for portable component-library artifacts where render-reachable CSS matters.

Distillate is a theme-agnostic CSS style engine for component library authors who need one authored style system to emit two forms: a readable stylesheet for host applications, and a compact, tree-shaken, render-reachable CSS payload for self-contained artifacts such as emails, SVG renders, agent replies, and exported HTML. It has one runtime dependency, [stylis](https://github.com/thysultan/stylis.js) 4.4.0, and no brand assumptions: prefixes, theme tokens, and scope selectors all come from the environment you provide.

If you are styling an application directly, or need per-render dynamic class names, `styled.*`, keyframes, or object styles, see the [comparison guide](https://elastic.github.io/distillate/guides/vs-emotion.html) to decide whether Distillate fits.

- **Docs:** [elastic.github.io/distillate](https://elastic.github.io/distillate/)
- **Playground:** [elastic.github.io/distillate/playground](https://elastic.github.io/distillate/playground/)
- **Examples:** [`docs/examples/`](https://github.com/elastic/distillate/tree/main/docs/examples) (executed by the test suite, so the CSS output shown below is real)

## Install

```sh
npm install @elastic/distillate
```

Requires Node.js 20 or later. The package ships as ESM (`import`) with a parallel CommonJS build (`require`) for consumers that cannot load ESM directly — see [Installation](https://elastic.github.io/distillate/getting-started/installation.html).

## Quick start

Bind the engine to your library with `createDistillery`. The snippets use an EUI-flavored environment to show that the engine carries no brand of its own.

```ts
import { createDistillery, cq, lightDark } from '@elastic/distillate';

const distillery = createDistillery({
  prefix: 'eui',
  themeScope: '.eui-view',
  theme: {
    colors: {
      ink: lightDark('#111', '#eee'),
      accent: lightDark('#06c', '#8cf'),
    },
    gap: cq('8px', '2cqi'),
  },
});
```

Author modules against the distillery. The derived token tree is `tokens`, typed by `TokensOf`:

```ts
const demo = distillery.createStyleModule('demo', ({ css, tokens }) => ({
  root: css`
    color: ${tokens.colors.ink};
    padding: ${tokens.gap};
  `,
}));
```

Emit a compact artifact payload (only what a render reached) or the full readable stylesheet:

```ts
const collector = distillery.artifactCollector('compact');
collector.use(demo.handles.root);
distillery.renderStyles(collector);
// => '.eui-view{--a:light-dark(#111,#eee)}.a{color:var(--a);padding:8px}'

distillery.renderStyles(distillery.stylesheetCollector());
// => '.eui-view{--eui-colors-ink:light-dark(#111,#eee)}.demo-root{color:var(--eui-colors-ink);padding:8px}'
```

## Output matrix

The same source emits four kinds of CSS. Pick a **target** and a **name mode**:

|                  | `readable`                                                                        | `compact`                                                                                             |
| ---------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **`stylesheet`** | Public stylesheet: `.demo-root`, `--eui-colors-ink`. Use `stylesheetCollector()`. | Minified names for the full sheet. Rare; compact names only pay off when HTML and CSS ship together.  |
| **`artifact`**   | Readable names, tree-shaken to the handles a render collected.                    | Minimal payload: `.a`, `--b`, unused variants and tokens dropped. Use `artifactCollector('compact')`. |

Collection is a side effect of rendering: resolving a handle pulls it in, which auto-activates any `rule` / `media` / `container` whose selector dependencies are all collected. Variant entries stay off always-on collection until a renderer names them. See [Naming and output](https://elastic.github.io/distillate/concepts/naming-and-output.html).

## Entry points

| Import                        | What it is                                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `@elastic/distillate`         | Engine: `createDistillery`, authoring (`css`, `rule`, `media`, `container`, `variants`), tokens, collector, renderer. |
| `@elastic/distillate/emotion` | `@emotion/css`-shaped `css` / `cx` / `injectGlobal` over the same registry, plus `createDomSink`.                     |
| `@elastic/distillate/testing` | `assertVarRefsHaveDeclarations` / `findVarRefViolations`. No third-party dependency.                                  |

`./testing` is the only entry that does not reach `stylis`. Nested `css` templates walk stylis `compile()` output; the pin is **4.4.0** exactly.

## Emotion-style authoring

```ts
import { createEmotion } from '@elastic/distillate/emotion';

const { css, cx, injectGlobal } = createEmotion(distillery);

const card = css`
  color: var(--eui-colors-ink);
  &:hover {
    color: var(--eui-colors-accent);
  }
  @media (min-width: 600px) {
    padding: 8px;
  }
`;

// <div className={cx('surface', card)} />
```

`String(card)` is the readable class name and does not collect. Passing the same handle through a collector's `resolveClassName` collects and compacts like a native handle. `createDomSink` manages one `<style>` element for the readable stylesheet.

To override, compose by interpolating a base handle into a new tagged template so declarations re-target the composing class (last wins). Render order is sort order, not registration order. Object styles, `keyframes`, and `@container` inside a `css` template are not supported; use the `container(...)` factory for container queries.

## Single-copy requirement

The engine keeps module-scope caches (variant markers, dependent-entry maps, and the emotion per-registry state), so exactly one copy of `@elastic/distillate` may load at runtime. Consumers that bundle must externalize the package.

A second copy with a different identity token registers a console warning at import (`Symbol.for('elastic.distillate.instance')`). It warns rather than throws because two copies degrade output — `variants(...)` tree-shaking silently fails — without crashing. The `sideEffects` field lists `**/instance.ts` and `**/instance.js` so the guard survives both source and built consumption. HMR and a fresh test registry can also warn, because the token is regenerated on every load.

## Public contract

- `prefix`, module names, handle-path keys, and `vars(...)` group and key names must each be a CSS identifier segment: a letter or underscore, then letters, digits, hyphens, or underscores. Theme-tree keys omit hyphens: `/^[A-Za-z_][A-Za-z0-9_]*$/`.
- Readable class names are `${moduleName}-${path.join('-')}`. Readable custom properties are `cssVarName(prefix, path)`. Distinct authored paths that join to the same string throw at `createDistillery` or `registerModule`.
- Template interpolations are spliced into CSS verbatim. Authored CSS must never be bound to untrusted input.
- Differing `lightDark` values fold into `light-dark(...)`.

## Docs and examples

- [Getting started](https://elastic.github.io/distillate/getting-started/index.html)
- [Concepts](https://elastic.github.io/distillate/concepts/index.html)
- [Guides](https://elastic.github.io/distillate/guides/index.html) — including [Distillate vs CSS-in-JS](https://elastic.github.io/distillate/guides/vs-emotion.html) and [React renderer integration](https://elastic.github.io/distillate/guides/react-renderer.html)
- [API reference](https://elastic.github.io/distillate/reference/index.html)
- [Playground](https://elastic.github.io/distillate/playground/)
- Runnable samples: [`docs/examples/`](https://github.com/elastic/distillate/tree/main/docs/examples)
- Contributing: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Support: [`SUPPORT.md`](SUPPORT.md)
