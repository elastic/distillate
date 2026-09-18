# Directory Update Log

## 2026-09-18

- **Update**: First `main` release is `0.1.0` via `scripts/run_semantic_release.js`. Development toolchain is Node 24 (`.nvmrc`); published `engines.node` stays `>=20`.

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
