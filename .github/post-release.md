# After the first public release

Follow-through once `@elastic/distillate` has been published and the repository is public. Each item is enough for a human or an agent to act on without private context.

## Cut a release

1. Confirm `main` is green and the changelog-driving commits since the last tag are the ones you intend to ship.
2. Run the **Publish a Release** workflow (`release.yml`) from the Actions tab. It is `workflow_dispatch` only — nothing publishes on push.
3. First run it with **dry_run** enabled. That exercises `pnpm verify` and semantic-release without publishing. With no prior git tag, the first `main` release is **0.1.0** (`scripts/semantic_release_first_version.js` overrides semantic-release's default `1.0.0`).
4. Publishing needs an `NPM_TOKEN` repository secret for `@elastic/distillate`, plus a `GITHUB_TOKEN` that can create releases and push the version bump. The release workflow exports that token as both `NPM_TOKEN` for `@semantic-release/npm` and `NODE_AUTH_TOKEN` for the npm registry auth written by `actions/setup-node`. Configure `NPM_TOKEN` before a non-dry run. The supported consumer install is `npm install @elastic/distillate` from registry.npmjs.org, the same contract as `@elastic/eui`.
5. A successful run tags the version, publishes `@elastic/distillate` to the npm registry, updates `CHANGELOG.md` and `package.json`, and creates a GitHub Release. Later `feat:` commits become `0.2.0`, `0.3.0`, …; a `BREAKING CHANGE` becomes `1.0.0`.

## Move CI onto shared infrastructure

Pull-request checks currently run on GitHub Actions and call pnpm scripts (`typecheck`, `lint`, `test`, `build`, `smoke:exports`, `smoke:declarations`, `licenses:report --check`). A shared CI pipeline should call the same scripts.

- [`catalog-info.yaml`](../catalog-info.yaml) is the service-catalog descriptor. Add a pipeline resource there when the pipeline exists.
- [`.buildkite/pull-requests.json`](../.buildkite/pull-requests.json) is a disabled template for pull-request builds. Enable it and point `pipeline_slug` at the registered pipeline.

No check logic needs to be rewritten to change runners.

## Upgrade ESLint

The repo is on ESLint 9 with flat config. Move to ESLint 10 when every plugin in `package.json` (`typescript-eslint`, `eslint-plugin-license-header`, `eslint-plugin-prettier`, `eslint-plugin-simple-import-sort`) declares support, then re-run `pnpm verify`.

## Keep the license report current

`THIRD_PARTY_LICENSES.md` is the source and distribution dependency manifest. `NOTICE.txt` carries the product notice plus each runtime dependency's NOTICE and license text. After any dependency change:

```sh
pnpm licenses:report
```

Commit both files. CI fails `pnpm licenses:report --check` when they drift.

## Reconcile downstream copies

Any project that currently vendors or workspace-links this engine should switch to the published `@elastic/distillate` version and drop its local copy once that version covers the APIs it uses.
