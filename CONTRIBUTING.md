# Contributing to Distillate

## Who maintains this

Distillate is Elastic-maintained. [`CODEOWNERS`](CODEOWNERS) lists the reviewers. The roadmap follows Kibana and other Elastic hosts — not a community product SLA.

Keeping this engine outside Kibana is intentional: one CSS package, several hosts. Releases and review happen here, not on the Kibana release train.

## Support

See [`SUPPORT.md`](SUPPORT.md). There is no SLA on this repository. Product bugs that only show up in Kibana or Cloud still go through those products. Engine bugs belong in this repo's GitHub issues.

Security reports go through [Elastic's process](https://www.elastic.co/community/security), not a public GitHub issue.

## What to contribute

- **Elastic employees** — maintainers prioritize internal host needs first. If your change is not on that list, you can still send the PR.
- **Community** — issues and PRs are accepted on a **best-effort** basis. Unsolicited API or architecture work may be declined.

External PRs should start from an issue. Comment on the issue before you start. Prefer issues labelled `help wanted` when that label is present.

Do not open drive-by PRs for large core work, design-system restyles, or high-impact public-API changes without an agreed issue.

## Development

Prerequisites: Node.js 24 (see `.nvmrc`) and pnpm via Corepack. The published package declares `engines.node` `>=20`. This repository uses pnpm; consumers may install the published package with npm, pnpm, or yarn.

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

First-party source files carry:

```ts
Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
or more contributor license agreements. Licensed under the Elastic License
2.0; you may not use this file except in compliance with the Elastic License
2.0.
```

Licensed under the Elastic License 2.0 (SPDX: `Elastic-2.0`). See [`LICENSE.txt`](LICENSE.txt). `pnpm lint:fix` inserts a missing header. Do not stack a second one.
