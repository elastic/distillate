---
navigation_title: Naming and output
description: Artifact versus stylesheet, compact versus readable, with a worked example per quadrant.
---

# Naming and output

Two independent axes. **Target** is how much CSS you want. **Name mode** is how classes and custom properties are spelled.

|                  | `readable`                                        | `compact`                                                      |
| ---------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| **`stylesheet`** | Public sheet. `.demo-root`, `--eui-colors-ink`.   | Minified names for the full sheet. Unusual.                    |
| **`artifact`**   | Readable names, tree-shaken to collected handles. | Minimal payload. `.a`, `--b`. HTML and CSS must ship together. |

Same module for every quadrant:

```ts
const demo = distillery.createStyleModule('demo', ({ css, tokens }) => ({
  root: css`
    color: ${tokens.colors.ink};
    padding: ${tokens.gap};
  `,
  unused: css`
    color: ${tokens.colors.accent};
  `, <1>
}));
```

1. Collected only by `stylesheetCollector()`. Artifact collectors that `use(root)` drop this handle and `--eui-colors-accent`.

## Stylesheet + readable

```ts
distillery.renderStyles(distillery.stylesheetCollector());
```

Includes `unused`. Theme vars use `cssVarName(prefix, path)`:

```css
.eui-view {
  --eui-colors-ink: light-dark(#111, #eee);
  --eui-colors-accent: light-dark(#06c, #8cf);
}
.demo-root {
  color: var(--eui-colors-ink);
  padding: 8px;
}
.demo-unused {
  color: var(--eui-colors-accent);
}
```

Use this in an app that loads one CSS file and writes `class={handle.readableName}`.

## Stylesheet + compact

```ts
distillery.renderStyles(distillery.stylesheetCollector('compact'));
```

Still every entry, but classes and compacted theme vars are short identifiers assigned from sorted keys. Only useful if the markup that refers to those classes was emitted with the same resolver.

## Artifact + readable

```ts
const collector = distillery.artifactCollector('readable');
collector.use(demo.handles.root);
distillery.renderStyles(collector);
```

`unused` and `--eui-colors-accent` are gone. Class names stay stable:

```css
.eui-view {
  --eui-colors-ink: light-dark(#111, #eee);
}
.demo-root {
  color: var(--eui-colors-ink);
  padding: 8px;
}
```

## Artifact + compact

```ts
const collector = distillery.artifactCollector('compact');
collector.use(demo.handles.root);
distillery.renderStyles(collector);
```

```css
.eui-view {
  --a: light-dark(#111, #eee);
}
.a {
  color: var(--a);
  padding: 8px;
}
```

This is the payload target: emails, SVG, exported HTML, agent replies. Compact names are **not** stable across different collected sets. Always emit HTML and CSS from the same collector/resolver pair.

## Render options

```ts
distillery.renderStyles(collector, resolver, {
  flatten: 'muted', <1>
  alternates: [
    { variation: 'muted', selector: '[data-eui-theme="muted"]' }, <2>
  ],
  themeValueOverrides: { 'colors/ink': '#000' }, <3>
});
```

1. Flatten this variation into `themeScope`. Same declaration count as the base; values change. A media variation does not replace the primary block.
2. Emit only this variation's diff under a selector the consuming page supplies.
3. Replaces the light/dark pair with a single value. Wins over the flattened variation.

Custom-property names always follow `cssVarName(prefix, path)`: `--${prefix}-${path}` with `/` joined on `-` and a leading `vars/` stripped.

See [declare and select variations](../guides/theming.md).
