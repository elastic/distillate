# Directory Update Log

## 2026-09-18

- **Update**: `renderStyles({ scheme })` emits one scheme's literals instead of `light-dark(...)`. It applies to every var-block, so it composes with `{ flatten }` and `{ alternates }`. `themeValueOverrides` still wins. New tests pin a diff that collapses to the primary value under `scheme`.
- **Update**: First `main` release is `0.1.0` via `scripts/run_semantic_release.js` (patches semantic-release `FIRST_RELEASE`, which is both the first tag and `main`'s allowed range). Development toolchain is Node 24 (`.nvmrc`); published `engines.node` stays `>=20`.
- **Update**: A release no longer commits to `main`. `package.json` is pinned to `0.0.0-development`, `CHANGELOG.md` points at GitHub Releases, and `@semantic-release/git` and `@semantic-release/changelog` are gone. `release.yml` only tags, publishes to npm, and creates the release.

## 2026-09-17

- **Update**: Empty declaration blocks no longer emit. Compact collectors also drop empty untargeted handles from collection and `useHandles`. No-op warnings require `createDistillery({ dev: true })` (`dev` defaults to `false`). `{ warn }` on a collector overrides the sink.

## 2026-09-16

- **Update**: `resolveThemeValues` / `distillery.resolveValues` expose a nested literal-value tree (`ValuesOf<T>`) for non-CSS surfaces. `mapDomain` is the collector-free mapping primitive behind `variants()`. New playbook [Read theme values](playbooks/read-theme-values.md). `pnpm okf:check` re-run after index.
- **Update**: Theme vocabulary is now `variations` (declared diffs), `flatten` / `alternates` (render selection). `themes`, render-time `theme`, media-wrapper `tokens`, `ThemeDeclaration`, and `ResolvedThemeLayer` are gone. `ScaleToken` leaves still cannot vary. `pnpm okf:check` re-run after index.
## 2026-09-15

- **Update**: `CONTRIBUTING.md` and `SUPPORT.md` document Elastic-maintained, best-effort contributions and no product SLA.
- **Update**: `reference/public-contract.md` now records the package contract for the supported `npm install @elastic/distillate` path from `registry.npmjs.org`.

## 2026-09-12

- **Update**: `concepts/single-copy.md` gained a "Dual-package hazard" section and a `package` source, covering the new parallel CommonJS build (`dist/cjs`, `require`/`main` export conditions) alongside the existing ESM (`import`) build. `pnpm okf:check` re-run and passing.

## 2026-09-11

- **Creation**: Initial Distillate OKF v0.2 bundle covering concepts, entry points, playbooks, and reference.
