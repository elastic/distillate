# Contributing to Distillate

## Development

Prerequisites: Node.js 20 or later (see `.nvmrc`) and pnpm via Corepack.

```sh
corepack enable
pnpm install
pnpm verify
```

`pnpm verify` is the full local gate: typecheck, lint (ESLint with Prettier as a rule, markdownlint, and license headers), tests, build, the export/declaration smokes, and `pnpm licenses:report --check`.

Useful individual scripts:

- `pnpm test` — unit tests plus example and playground compile tests
- `pnpm lint` / `pnpm lint:fix` — ESLint (including Prettier) and markdownlint
- `pnpm build` — `tsc` plus specifier rewriting
- `pnpm docs:dev` — generate the API reference and serve the docs site with live reload (`docs-builder serve`, <http://localhost:3000>). Requires the [docs-builder](https://github.com/elastic/docs-builder) binary (`curl -sL https://ela.st/docs-builder-install | sh`)
- `pnpm playground:dev` — Vite playground
- `pnpm licenses:report` — regenerate `THIRD_PARTY_LICENSES.md` and `NOTICE.txt`

## Pull requests

- Use [conventional commits](https://www.conventionalcommits.org/). `feat:` and `fix:` drive the next release version.
- Add tests for behavioral changes.
- Run `pnpm verify` before opening a PR.
- Keep documentation updates in the same PR when the public API changes.

## License headers

Source files carry:

```ts
Copyright Elastic Technologies Inc. and contributors
SPDX-License-Identifier: Apache-2.0
```

`pnpm lint:fix` inserts a missing header. Do not stack a second one.
