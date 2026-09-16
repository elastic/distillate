# Directory Update Log

## 2026-09-15

- **Update**: `CONTRIBUTING.md` and `SUPPORT.md` document Elastic-maintained, best-effort contributions and no product SLA.
- **Update**: `reference/public-contract.md` now records the package contract for the supported `npm install @elastic/distillate` path from `registry.npmjs.org`.

## 2026-09-12

- **Update**: `concepts/single-copy.md` gained a "Dual-package hazard" section and a `package` source, covering the new parallel CommonJS build (`dist/cjs`, `require`/`main` export conditions) alongside the existing ESM (`import`) build. `pnpm okf:check` re-run and passing.

## 2026-09-11

- **Creation**: Initial Distillate OKF v0.2 bundle covering concepts, entry points, playbooks, and reference.
