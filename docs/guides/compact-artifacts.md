---
navigation_title: Ship a compact artifact
description: Collect the handles a render reached and emit a self-contained CSS payload, with a measured size comparison.
---

# Ship a compact artifact

Use this path when HTML and CSS leave the app together: an email, an SVG, a Slack message, an agent reply. Compact names are assigned from the collected key set, so they are not stable across renders. Emit markup and CSS from the same collector.

The environment matches [quick start](../getting-started/quick-start.md). Every handle that appears on an element must be collected **and** resolved:

```ts
import {
  createDistillery,
  cq,
  lightDark,
  variants,
} from '@elastic/distillate';

const distillery = createDistillery({
  prefix: 'eui',
  themeScope: '.eui-view',
  theme: {
    colors: {
      ink: lightDark('#111', '#eee'),
      accent: lightDark('#06c', '#8cf'),
      surface: lightDark('#fff', '#000'),
    },
    gap: cq('8px', '2cqi'),
  },
});

const panel = distillery.createStyleModule('panel', ({ css, tokens }) => ({
  root: css`
    padding: ${tokens.gap};
    background: ${tokens.colors.surface};
  `,
  tone: variants(
    ['calm', 'loud'] as const,
    (tone) =>
      css`
        outline-color: ${tone === 'calm' ? tokens.colors.surface : tokens.colors.accent};
      `
  ),
}));

const collector = distillery.artifactCollector('compact');
const used = [panel.handles.root, panel.handles.tone.loud]; // include the variant; use(panel) skips it
const retained = collector.useHandles(used);

const resolver = collector.createResolver(); // after collection; compact ids depend on the full set
const className = retained
  .map((handle) => resolver.className(handle.key, handle.readableName))
  .join(' ');
const css = distillery.renderStyles(collector, resolver);
```

`useHandles` auto-collects nested `&:hover` and `media(...)` / `container(...)` inner rules whose selector deps are met.

## Two-pass render

Compact class names depend on the **full** collected set. If you print class names during the walk that collects handles, you will mint names too early.

1. Walk the tree. For every style you would apply, `collector.useHandles([...])`. Do not read compact names yet.
2. `const resolver = collector.createResolver()`.
3. Walk again (or serialize from a recorded list). Write `resolver.className(handle.key, handle.readableName)` only for handles `useHandles` retained.
4. `distillery.renderStyles(collector, resolver)` and inline the CSS.

A readable artifact (`artifactCollector('readable')`) can skip the second pass because `handle.readableName` does not depend on the collected set. Compact is cheaper on the wire; readable is easier to debug.

## How much smaller

[`docs/examples/06-payload.ts`](https://github.com/elastic/distillate/blob/main/docs/examples/06-payload.ts) authors one module with unused variants and handles, then emits the full readable stylesheet and a compact artifact from a single `root` + `tone.calm` render. The example returns both strings and their UTF-8 byte lengths. In this fixture the compact artifact is about a quarter of the stylesheet. The test asserts it stays under 40% — shaking plus compact names, which is the payload that actually ships.

The playground CSS pane shows the same comparison live: full stylesheet versus compact artifact, with byte counts visible without switching tabs.

## What is pruned

- Unnamed variant entries
- Handles the walk never named
- Empty untargeted handles (no-op templates). `useHandles` omits them from its return value; resolve only that list.
- Local-var defaults that no collected declaration reads. Per-handle, `reachableDefaults` keeps only keys referenced by that handle or by a collected rule whose selector targets it. Rule-level default markers have no host handle and emit every listed key. See [reachability collection](../concepts/collection.md).
- Theme tokens whose paths were never collected (not interpolated into a collected declaration, not a surviving default-marker value dep, and not marked with `useThemeVar`). A collected path still emits even if the body does not textually contain `var(...)`.

`injectGlobal` styles are **not** in an artifact unless you `collector.use(module)` each `globalModules()` entry. Call `stylesheet()` / `stylesheetCollector()` when globals should always ship.

A React host that does both passes for you is in [Integrate with a React renderer](react-renderer.md).
