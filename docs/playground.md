---
navigation_title: Playground
description: Live Distillate editor with stylesheet, compact names, and a tree-shaken artifact.
---

# Playground

The playground is a full-viewport workbench: source and tokens on the left, a centered live preview in the remaining canvas, and generated CSS under the preview.

- **On GitHub Pages:** [elastic.github.io/distillate/playground](https://elastic.github.io/distillate/playground/)
- **Locally:** `pnpm playground:dev` from the repo root (Vite, default <http://localhost:5173>)

Two authoring modes share one demo environment (`prefix: 'dstl'`, theme vars on `:host`):

- **Emotion** — tagged `css` templates, plus `cx`, `injectGlobal`, `tokens`, and `cn`
- **Native module** — `createStyleModule`, `rule`, `media`, `container`, `variants`, `tokens`, `cn`

The editor is Monaco with TypeScript IntelliSense for the injected playground scope (`css` / `createStyleModule`, `tokens`, `cn`, …). Generated CSS is a read-only Monaco view of the compile output. Imports in snippets are educational; the real bindings are injected at eval time. Each snippet ends in `return` of an HTML string.

**Readable** and **Compact** are naming modes on the full stylesheet (`stylesheetCollector`). **Artifact** is the compact payload from the handles the returned markup actually named (`artifactCollector`, after collection completes). Byte counts for the full stylesheet versus that artifact stay visible above the CSS; they are the same comparison as [`docs/examples/06-payload.ts`](https://github.com/elastic/distillate/blob/main/docs/examples/06-payload.ts). Card, Buttons, Tree shake, Local vars, and Media + container ship in both modes so you can compare authoring. Switching Emotion vs Native keeps the selected example. **Tree shake** names one style in the markup; the stylesheet still contains the rest. See [`docs/playground/src/examples/snippets.ts`](https://github.com/elastic/distillate/blob/main/docs/playground/src/examples/snippets.ts).

Emotion handles collect when `cx(...)`, `cn(...)`, or string interpolation (`${handle}`) runs during the returned markup. `injectGlobal` still follows engine semantics: it ships in the stylesheet and is omitted from the artifact unless you collect those modules yourself.

A read-only Tokens table sits under the editor and lists every `tokens.*` path in the demo environment with its resolved CSS (`themeVars` light/dark for colors and fonts; `value` / `.cq` for scales). Color swatches follow the Preview Light/Dark toggle. Demo colors use Borealis brand values (`primary`, `accent`, `accentSecondary`, `success`, `warning`, `danger`) plus text, surface, subtle, and border — hard-coded, not imported from EUI.

The chrome around the editor is itself a Distillate readable stylesheet (`prefix: 'pg'`, theme vars on `:root`), kept on a separate distillery from snippet compilation so the two registries never mix.

The compile pipeline is sucrase (TypeScript → JS) then `new Function`. It is a demo, not a sandbox: do not paste untrusted source.
