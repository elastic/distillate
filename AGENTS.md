# Agent instructions

Canonical, tool-agnostic instructions for any coding agent working in this repository.

Distillate is a theme-agnostic CSS style engine. It has one runtime dependency (`stylis`) and three public entry points: `.`, `./emotion`, and `./testing`.

## Verify your work

```sh
pnpm verify
```

That is the complete local gate. If a check fails in a way that looks unrelated to your change, say so rather than papering over it.

## Conventions

- Conventional commits. `feat:` and `fix:` are release-driving.
- License headers are enforced by ESLint (`license-header/header`). Use `pnpm lint:fix` rather than inserting them by hand.
- After adding or changing a dependency, run `pnpm licenses:report` and include the updated `THIRD_PARTY_LICENSES.md` and `NOTICE.txt`.
- Do not invent a bundler for the library build. `tsc` plus `tsc-alias` is the toolchain.
- When public API, docs, examples, or behavior change, update `.okf/distillate`, run `pnpm okf:check` and `pnpm okf:index`, and record meaningful changes in `.okf/distillate/log.md`.
- `.okf/**` is excluded from markdown and Prettier formatting because `okf index` owns generated index formatting.
- Keep comments short. Do not narrate decisions that git history already records.
