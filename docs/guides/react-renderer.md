---
navigation_title: Integrate with a React renderer
description: Collect handles while rendering, then emit class names and CSS.
---

# Integrate with a React renderer

Distillate does not ship a React runtime. A host renderer owns the class-name context and decides when to collect.

## Readable stylesheet (app)

Register modules at module-eval time. Emit one stylesheet (build step or `createDomSink`) and put `handle.readableName` on `className`. No collector is required at render time:

```tsx
import { createDistillery, cq, lightDark } from '@elastic/distillate';
import type { ReactNode } from 'react';

const distillery = createDistillery({
  prefix: 'eui',
  themeScope: '.eui-view',
  theme: {
    colors: { ink: lightDark('#111', '#eee') },
    gap: cq('8px', '2cqi'),
  },
});

const { handles } = distillery.createStyleModule('button', ({ css, tokens }) => ({
  root: css`
    color: ${tokens.colors.ink};
  `,
}));

export const Button = ({ children }: { children: ReactNode }) => (
  <button className={handles.root.readableName}>{children}</button>
);

// writeFileSync(
//   'dist/styles.css', 
//   distillery.renderStyles(distillery.stylesheetCollector())
// );
```

## Compact artifact (export / email / SVG)

Collection has to observe the tree. Compact names depend on the full collected set, so render twice: once to `useHandles`, once to write class names. `combineClassNames` is the component-facing API so views never mention the collector.

Reuse the distillery and `button` module from above. The extra pieces are a context, views that call `combineClassNames`, and a two-pass helper. Imports in the next snippet cover the rest of this section.

### Pass a class-name context

Both render passes implement this shape. Views only ever see `resolveClassName`:

```tsx
import {
  combineClassNames,
  type Distillery,
  type StyleHandle,
  type StylesModule,
} from '@elastic/distillate';
import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

interface StyleContextValue {
  resolveClassName: (...handles: StyleHandle[]) => string;
}

const StyleContext = createContext<StyleContextValue | null>(null);

const useStyleContext = (): StyleContextValue => {
  const value = useContext(StyleContext);
  if (!value) {
    throw new Error('StyleContext is missing.');
  }
  return value;
};
```

### Views call `combineClassNames`

Same `handles.root` as the app button. Swap `readableName` for the context:

```tsx
const Button = ({ children }: { children: ReactNode }) => {
  const ctx = useStyleContext();
  return <button className={combineClassNames(ctx, handles.root)}>{children}</button>;
};
```

Pass every handle the element should wear: `combineClassNames(ctx, handles.root, other.handles.title)`.

### Render twice

The first pass must finish before any class name is printed. `createResolver()` assigns compact names from the collected set; reading them earlier mints names too soon. Leave `globals` empty unless you have `injectGlobal` styles (next section).

```tsx
export const renderArtifact = (
  tree: ReactElement,
  distillery: Distillery,
  globals: readonly StylesModule[] = []
): { html: string; css: string } => {
  const collector = distillery.artifactCollector('compact');
  for (const module of globals) {
    collector.use(module);
  }

  // Pass 1: record handles. Compact names are not assigned yet.
  const collecting: StyleContextValue = {
    resolveClassName: (...handles) => {
      collector.useHandles(handles);
      return '';
    },
  };

  renderToStaticMarkup(
    <StyleContext.Provider value={collecting}>{tree}</StyleContext.Provider>
  );

  const resolver = collector.createResolver();

  // Pass 2: write class names now that the collected set is complete.
  const emitting: StyleContextValue = {
    resolveClassName: (...handles) =>
      collector
        .useHandles(handles)
        .map((handle) => resolver.className(handle.key, handle.readableName))
        .join(' '),
  };

  const html = renderToStaticMarkup(
    <StyleContext.Provider value={emitting}>{tree}</StyleContext.Provider>
  );
  return { html, css: distillery.renderStyles(collector, resolver) };
};

renderArtifact(<Button>Hello</Button>, distillery);
```

A readable artifact can skip the emitting pass because `handle.readableName` does not depend on the collected set. For a live tree, use [a live readable collection](#live-readable-collection-shadow-root). See [Ship a compact artifact](compact-artifacts.md).

### Include `injectGlobal` styles

Globals from `injectGlobal` are separate modules. They are not implied by collecting handles; pass `globalModules()` into the helper when they should ship with the artifact:

```tsx
import { createEmotion } from '@elastic/distillate/emotion';

const { injectGlobal, globalModules } = createEmotion(distillery);

injectGlobal`
  html {
    color-scheme: light dark;
  }
`;

renderArtifact(<Button>Hello</Button>, distillery, globalModules());
```

Do not mix a compact stylesheet with markup that used `readableName`. The DOM will carry `.button-root` while the `<style>` contains `.a`.

## Live readable collection (shadow root)

A host that renders into a shadow root, or any isolated root, needs only the CSS that tree resolves. Readable names do not depend on the collected set, so one live render is enough. `distillery.liveCollection()` returns `{ resolveClassName, css, collector }`, which already fits the class-name context above:

```tsx
import { createDomSink } from '@elastic/distillate';
import { useState } from 'react';
import { createPortal } from 'react-dom';

export const ShadowStyles = ({
  root,
  children,
}: {
  root: ShadowRoot;
  children: ReactNode;
}) => {
  const [live] = useState(() =>
    distillery.liveCollection({
      sink: createDomSink({ document: root.ownerDocument, parent: root }),
    })
  );
  return (
    <StyleContext.Provider value={live}>
      {createPortal(children, root)}
    </StyleContext.Provider>
  );
};
```

Every handle, rule, or theme var the collection has not seen invalidates the sink. The sink rewrites its one `<style>` in a microtask, which lands before paint. A subtree that suspends and resolves later adds its handles and triggers another flush, so there is no "collection finished" moment to guess.

Add globals and extra theme vars through `live.collector`; they invalidate the sink the same way:

```tsx
for (const module of globalModules()) {
  live.collector.use(module);
}
live.collector.useThemeVar('colors/ink');
```

`css()` returns the CSS collected so far, for a host that writes it elsewhere. Pass `{ render }` to forward `renderStyles` options such as `scheme` or `alternates`.

The collection only grows. A render React discards may leave extra CSS, never missing CSS. Compact names depend on the complete collected set, so a live collection is readable only; compact artifacts still [render twice](#render-twice).
