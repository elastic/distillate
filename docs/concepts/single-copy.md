---
navigation_title: Single-copy invariant
description: Exactly one copy of Distillate may load at runtime.
---

# Single-copy invariant

The engine keeps module-scope state:

- A `WeakSet` of values produced inside `variants(...)`, so `collector.use(module)` can skip them.
- A `WeakMap` from module to dependent-entry lists, so auto-collection does not walk the whole registry per handle.
- Per-registry emotion caches (template wrappers, sinks).

Two copies of the module mean two caches. Variants from copy A look unmarked to copy B's collector, so they ship in every artifact and inflate CSS. That reads as a payload regression, not a throw.

## What the package does

On import, `src/instance.ts` stores a random identity token on `globalThis[Symbol.for('elastic.distillate.instance')]`. A later import with a different token logs a `console.warn`. It warns rather than throws because two copies degrade output without breaking it. A reload (HMR, a fresh vitest registry) also mints a new token, so a warning is not proof of two physical packages.

The package `sideEffects` field lists `**/instance.ts` and `**/instance.js` so bundlers do not tree-shake the guard away.

## What consumers must do

Do not nest a second version of `@elastic/distillate` in an app's `node_modules`. When a **library** bundles, mark Distillate external so the app supplies the one copy. When an **app** bundles, force every importer to resolve the copy at the project root.

### Vite

`ssr.external` leaves Distillate out of the SSR bundle (Node loads the package once). `resolve.dedupe` makes client and SSR resolve the same physical directory. `build.rollupOptions.external` is for library builds; do not set it in an app that must ship Distillate to the browser.

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    dedupe: ['@elastic/distillate'],
  },
  ssr: {
    external: [
      '@elastic/distillate',
      '@elastic/distillate/emotion',
      '@elastic/distillate/testing',
    ],
  },
  // Library packages only — omit this block in an application:
  build: {
    rollupOptions: {
      external: ['@elastic/distillate', /^@elastic\/distillate\//],
    },
  },
});
```

### Rollup (library)

```js
export default {
  external: ['@elastic/distillate', /^@elastic\/distillate\//],
};
```

### webpack

Library:

```js
module.exports = {
  externals: {
    '@elastic/distillate': '@elastic/distillate',
    '@elastic/distillate/emotion': '@elastic/distillate/emotion',
    '@elastic/distillate/testing': '@elastic/distillate/testing',
  },
};
```

App — pin every importer to the hoisted package:

```js
module.exports = {
  resolve: {
    alias: {
      '@elastic/distillate$': require.resolve('@elastic/distillate'),
      '@elastic/distillate/emotion$': require.resolve(
        '@elastic/distillate/emotion'
      ),
      '@elastic/distillate/testing$': require.resolve(
        '@elastic/distillate/testing'
      ),
    },
  },
};
```

## Plugin-host architectures

In a platform where many independently built plugins share one runtime (Kibana-style), the platform — not any individual plugin — must own the single copy. Declare Distillate as a **platform-provided shared dependency** (similar to how `react` and `react-dom` are shared), and configure each plugin build to externalize all three entry points. A plugin that bundles its own copy will silently inflate every artifact it emits and break variant tree-shaking across the module boundary.
