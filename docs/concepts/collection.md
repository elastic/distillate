---
navigation_title: Reachability collection
description: StylesCollector, use versus useHandles, theme-var reachability, and per-handle default narrowing.
---

# Reachability collection

A `StylesCollector` is the set of entries that will ship. Class-name resolution collects as a side effect: the renderer names a handle, the handle's rules come along, and unread variables drop out.

Prefer the distillery helpers over constructing a collector yourself:

```ts
const collector = distillery.artifactCollector('compact');
collector.use(demo.handles.root); // only this handle ships
const css = distillery.renderStyles(collector);
```

`artifactCollector` starts empty. `stylesheetCollector(names?)` defaults to `'readable'` and preloads every registered module via `useAllEntries`. Both accept an optional `{ warn }` so hosts can capture no-op-handle warnings when `createDistillery({ dev: true })`.

## Tree-shaking and library stylesheets

`stylesheetCollector()` snapshots only modules whose files have already loaded and registered with this distillery. It does not discover or import style files, and modules loaded later are not added automatically.

Libraries declaring `"sideEffects": false` let bundlers remove files whose exports are unused. Rollup and Rolldown can therefore drop style files imported only for registration, silently leaving an incomplete or empty stylesheet. Registration is a real side effect: the **library that owns the style files** must describe it accurately in its published `package.json`. Distillate's own manifest cannot override another package's metadata.

For example, if registration files are named `*.styles.ts` and compile to `*.styles.js`, replace `"sideEffects": false` with:

```json
{
  "sideEffects": ["**/*.styles.js", "**/*.styles.ts"]
}
```

Match the **actual published registration files**, including ESM and CommonJS paths, not just a barrel or stylesheet entry. Adapt the patterns to your naming and output layout; keep any other existing side-effect exemptions (for example, CSS files). Include source patterns only if consumers can resolve source files. If your build bundles many modules into one output file, mark that output file instead and ensure the library build also retains registration.

Expose a library-owned stylesheet entry that loads the complete style inventory before collecting:

```ts
// stylesheet.ts: maintain or generate these imports inside the library.
import './styles/button.styles.js';
import './styles/panel.styles.js';
import { distillery } from './environment.js';

export const stylesheet = () =>
  distillery.renderStyles(distillery.stylesheetCollector());
```

Export this entry through the library's package exports, so consumers only import and call `stylesheet()`. Maintain or generate the imports at the library boundary as styles are added; consumers never pass a module list. The side-effect patterns retain imports but do not discover files: each intended style file must still be reachable through this entry's imports.

To reuse an existing style barrel instead of direct imports, import it from the stylesheet entry and mark **both the barrel and the actual style files** as side-effectful:

```json
{
  "sideEffects": ["./dist/styles/index.js", "**/*.styles.js"]
}
```

Adapt the barrel paths for every published output/source layout you expose. An unmarked barrel imported only for side effects can be skipped even when its style files are marked. Conversely, marking only the barrel does not retain unmarked style files. Adding a `void` read or using bare imports under `"sideEffects": false` does not fix retention.

`stylesheetCollector()` remains registry-based and includes all variants. `stylesheetCollector('compact', { warn })` remains supported. Retaining registration JavaScript does not disable Distillate's CSS reachability pruning: `artifactCollector` still emits only collected entries and their dependencies.

Verify the published package by bundling a consumer entry that only calls `stylesheet()` and checking its CSS, not just whether the barrel exists in the bundle. The regression fixture covers lost registrations under `"sideEffects": false`, incomplete barrel/style-file exemptions, and retained direct and barrel imports with readable/compact stylesheet output and artifact pruning.

## What each method collects

| Method                  | Effect                                                                                                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `use(module)`           | Non-variant entries on the module. Variants stay out.                                                                                                                                                             |
| `use(entry)`            | One handle, rule, or media block.                                                                                                                                                                                 |
| `useHandles(handles)`   | Those handles, then any `auto` rule or media-inner-rule whose deps are all present. Media blocks keep inner rules collected earlier. A bare `{ key }` resolves through the registry and throws when unregistered. |
| `useAllEntries(module)` | Every entry, including variants. Used by the stylesheet target.                                                                                                                                                   |
| `useThemeVar(path)`     | Marks a theme token path reachable even if no collected declaration reads it.                                                                                                                                     |

Paths are slash-delimited (`colors/ink`), matching `themeVars` keys. There is no `StylesCollector.artifact(...)` static factory.

## Strict selector deps

A rule that reads two handles (`button + other`) does not auto-collect when only `button` is named. Nested `&:hover` on a handle auto-collects with that handle. A nested block on an uncollected handle is dropped from artifacts.

## Theme-var reachability

`renderThemeVars` emits a declaration for every path in `collectedThemeDeps`. Those paths come from tokens interpolated into collected declarations, default-marker value deps that survive [per-handle narrowing](#per-handle-default-narrowing), and explicit `useThemeVar(path)` calls.

The emitted body CSS is not consulted. A collected path still ships if no remaining rule writes a textual `var(...)` for it. `useThemeVar` is the supported way to force a theme declaration that the body does not read.

Named variations, media variations, and `{ alternates }` still render through `renderThemeVars`. They change which values and extra blocks are written for the already-collected paths; they do not decide reachability.

## Per-handle default narrowing

`reachableDefaults(handle, groupPath)` is the finest pruning layer. When a handle declaration contains a local-var default group (`${look}`), emission keeps only the keys that handle actually reads — plus keys read by any collected rule whose selector targets that handle.

A default key that is declared but never referenced does not ship, and neither does its theme dep. `names module-local var groups with the environment prefix and prunes unreachable defaults` in `src/distillery.test.ts` is the executable spec.

### Rule-level defaults emit every key

`renderRule` has no host handle. Default markers on a rule (or a media-inner-rule) therefore emit **every** listed key, and `finalizeDeps` mirrors that by including all of them in the compact registry. Authors normally put `${group}` on handle declarations; if a rule ever carries a default marker, nothing inside that marker is pruned.

## No-op handle pruning

A handle is no-op when its declarations produce nothing **and** no rule targets it. With `createDistillery({ dev: true })`, Distillate warns once per such handle (process-wide) so the author can delete the empty template. Production stays silent: `dev` defaults to `false`. `{ warn }` on a collector overrides the sink; it does not turn warnings on. The single-copy guard always warns and is not gated by `dev`.

Empty blocks never ship: `renderStyles` drops a handle or rule whose rendered body is blank, and a media block whose inner fragments are all blank.

Dropping the class name itself happens only in `compact` mode. Readable names are stable, so a consumer stylesheet or test may scope on one. Compact names have no such contract, and no-op handles do not consume a compact slot. `useHandles` returns the retained handles so hosts can build the class string without changing `combineClassNames`.

A handle is targeted when some rule, or some inner rule of an `@media` / `@container` block, reads it in a selector. `recordRuleDeps` fills that in for nested `&` rules too, so a handle with an empty self block and a real `& h2` stays. A nested block with no rules inside it (`@media (...) {}`) targets nothing and does not rescue its owner. A local-var marker counts as content, so marker-bearing handles are never pruned.

## Resolvers

`collector.createResolver()` snapshots the current handle and var keys. In compact mode, names are assigned from the **sorted** key set, so call it after collection is complete. `renderStyles(collector)` does that for you when you omit the resolver argument.
