---
navigation_title: Migrate from Emotion
description: Adopt createEmotion without rewriting every call site.
---

# Migrate from Emotion

`@elastic/distillate/emotion` is an `@emotion/css`-shaped surface over a distillery: `css`, `cx`, `injectGlobal`, `stylesheet`, `globalModules`. Nested `&` and `@media` use stylis, so existing templates keep their meaning.

```ts
import { createEmotion, createDomSink } from '@elastic/distillate/emotion';

const sink = createDomSink({ document });
const { css, cx, injectGlobal } = createEmotion(distillery, { sink });
```

## What maps

| Emotion             | Distillate                                                                         |
| ------------------- | ---------------------------------------------------------------------------------- |
| `css\`...\``        | `css\`...\`` — returns a handle that stringifies to the readable class.            |
| `cx(...)`           | `cx(...)` — strings, numbers, falsy, arrays, maps, handles.                        |
| `injectGlobal`      | `injectGlobal` — registered as a module; ships in `stylesheet()`.                  |
| `<style>` injection | `createDomSink` — one element, rewritten on each registration, one flush per turn. |

## What does not map

| Emotion                                  | Status                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `css({ color: 'red' })`                  | Rejected. Tagged templates only.                                            |
| `keyframes`                              | Rejected.                                                                   |
| `@supports` / `@container` in `css`      | Rejected. Use `container(...)` from the root entry.                         |
| `styled.*` / `@emotion/react` `css` prop | Out of scope.                                                               |
| Runtime template values                  | Styles are static after first construction. Put variation on CSS variables. |

## Two ways to use a handle

`String(css\`...\`)`is the readable class name and **does not collect**. Use it only against a readable stylesheet (the DOM sink or`stylesheet()`).

The same value passed through `resolveClassName` / `collector.useHandles` participates in compact artifact emission. SSR: render `stylesheet()` on the server; content hashes make client and server class names agree.

## Composition

Do not rely on declaration order across separate `css` calls. Interpolate:

```ts
const base = css`
  color: red;
`;
const ext = css`
  ${base} <1>
  color: blue;
`;
```

1. Compose by interpolation. Both declarations land on `ext`'s class; later wins.

## Mix with native modules

`cx` accepts native `StyleHandle` values and uses their `readableName`. A host can migrate file by file: new modules through `createStyleModule`, remaining call sites through `createEmotion` on the same distillery.
