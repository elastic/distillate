---
navigation_title: Your first stylesheet
description: Register several handles and emit a readable sheet for an app.
---

# Your first stylesheet

Use the **stylesheet** target when a host app will load one CSS file and refer to stable class names. Readable names are `${moduleName}-${path}`: `.panel-root`, `.panel-title`.

This continues the [quick start](quick-start.md) environment (`colors.ink`, `colors.accent`, `colors.surface`, `gap`). The file below is complete on its own.

```ts
import { createDistillery, cq, lightDark } from '@elastic/distillate';

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
  title: css`
    color: ${tokens.colors.ink};
  `,
}));

const css = distillery.renderStyles(distillery.stylesheetCollector());
```

```css
.eui-view {
  --eui-colors-ink: light-dark(#111, #eee);
  --eui-colors-surface: light-dark(#fff, #000);
}
.panel-root {
  padding: 8px;
  background: var(--eui-colors-surface);
}
.panel-title {
  color: var(--eui-colors-ink);
}
```

`stylesheetCollector()` preloads every registered module, including variants. Apply `panel.handles.root.readableName` (or `String(handle)` on an emotion wrapper) in markup. Readable stringification does **not** collect; it only works when the document's stylesheet also used readable names.

For HTML that leaves the app with its CSS inlined, switch to [compact artifacts](../guides/compact-artifacts.md). For how names and targets combine, see [naming and output](../concepts/naming-and-output.md).
