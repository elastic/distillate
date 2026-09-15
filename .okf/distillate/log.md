# Directory Update Log

## 2026-09-15

- **Update**: Product license is dual Elastic License 2.0 and Server Side Public License, v 1, matching EUI. `CONTRIBUTING.md` and `SUPPORT.md` document Elastic-maintained, best-effort contributions and no product SLA.
- **Update**: `reference/public-contract.md` now records the package contract for the dual-license distribution files, the supported `npm install @elastic/distillate` path from `registry.npmjs.org`, and release publishing's `NPM_TOKEN` / `NODE_AUTH_TOKEN` authentication requirement.

## 2026-09-12

- **Update**: `concepts/single-copy.md` gained a "Dual-package hazard" section and a `package` source, covering the new parallel CommonJS build (`dist/cjs`, `require`/`main` export conditions) alongside the existing ESM (`import`) build. `pnpm okf:check` re-run and passing.

## 2026-09-11

- **Creation**: Initial Distillate OKF v0.2 bundle covering concepts, entry points, playbooks, and reference.
